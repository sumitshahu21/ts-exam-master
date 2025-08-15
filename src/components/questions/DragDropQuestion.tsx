import { useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { Question } from '../../types';

interface DragDropQuestionProps {
  question: Question;
  onAnswerChange: (selected: string[]) => void;
}

interface DraggableItemProps {
  id: string;
  content: string;
  isInTarget?: boolean;
}

function DraggableItem({ id, content, isInTarget }: DraggableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-3 bg-white border-2 border-dashed border-gray-300 rounded-lg cursor-move
        ${isDragging ? 'opacity-50' : ''}
        ${isInTarget ? 'bg-green-50 border-green-300' : 'hover:border-blue-300'}
        transition-colors duration-200
      `}
    >
      {content}
    </div>
  );
}

function DropTarget({ 
  id, 
  content, 
  droppedItem,
  droppedItemContent 
}: { 
  id: string; 
  content: string; 
  droppedItem?: string;
  droppedItemContent?: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        p-4 border-2 border-dashed rounded-lg min-h-[80px] flex items-center justify-center
        ${droppedItem ? 'border-green-300 bg-green-50' : 'border-gray-300'}
        ${isOver ? 'border-blue-500 bg-blue-50' : ''}
        transition-colors duration-200
      `}
    >
      <div className="text-center w-full">
        <p className="font-medium text-gray-700 mb-2">{content}</p>
        {droppedItem && droppedItemContent && (
          <div className="mt-2">
            <DraggableItem 
              id={droppedItem} 
              content={droppedItemContent} 
              isInTarget={true}
            />
          </div>
        )}
        {!droppedItem && (
          <p className="text-xs text-gray-500">Drop an item here</p>
        )}
      </div>
    </div>
  );
}

function ItemSpace({ 
  items,
  isOver 
}: { 
  items: Array<{ id: string; content: string }>;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: 'item-space' });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[200px] p-4 border-2 border-dashed rounded-lg
        ${isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
        transition-colors duration-200
      `}
    >
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Drag items from here:
        {isOver && <span className="text-blue-600 ml-2">(Drop to return item)</span>}
      </h3>
      <div className="space-y-3">
        {items.map((item) => (
          <DraggableItem key={item.id} id={item.id} content={item.content} />
        ))}
        {items.length === 0 && !isOver && (
          <p className="text-gray-500 text-sm italic">All items have been placed</p>
        )}
        {items.length === 0 && isOver && (
          <p className="text-blue-600 text-sm">Drop item here to return it</p>
        )}
      </div>
    </div>
  );
}

export default function DragDropQuestion({ 
  question, 
  onAnswerChange 
}: DragDropQuestionProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over) {
      const itemId = active.id as string;
      const targetId = over.id as string;
      
      // Update assignments
      const newAssignments = { ...assignments };
      
      // Remove item from previous assignment (if any)
      Object.keys(newAssignments).forEach(key => {
        if (newAssignments[key] === itemId) {
          delete newAssignments[key];
        }
      });
      
      // If dropping on item-space, just remove the item (already done above)
      // If dropping on a target, assign the item to that target
      if (targetId !== 'item-space') {
        // If target already has an item, that item becomes available again
        // (no need to do anything special, it will show up in availableItems)
        
        // Assign new item to target
        newAssignments[targetId] = itemId;
      }
      
      setAssignments(newAssignments);
      
      // Convert to answer format expected by parent
      const answers = Object.entries(newAssignments).map(([target, item]) => `${item}-${target}`);
      onAnswerChange(answers);
    }
    
    setActiveId(null);
  };

  const availableItems = question.dragDropItems?.filter(item => 
    !Object.values(assignments).includes(item.id)
  ) || [];

  const getItemContent = (itemId: string) => {
    return question.dragDropItems?.find(item => item.id === itemId)?.content || '';
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{question.question}</h2>
        <p className="text-sm text-gray-600">Points: {question.points}</p>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Available items space */}
          <div>
            <ItemSpace 
              items={availableItems}
              isOver={false}
            />
          </div>

          {/* Drop targets */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Drop items here:</h3>
            <div className="space-y-3">
              {question.dragDropTargets?.map((target) => (
                <DropTarget
                  key={target.id}
                  id={target.id}
                  content={target.content}
                  droppedItem={assignments[target.id]}
                  droppedItemContent={getItemContent(assignments[target.id])}
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <DraggableItem 
              id={activeId} 
              content={getItemContent(activeId)} 
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {question.explanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-1">Instructions:</h4>
          <p className="text-sm text-blue-800">{question.explanation}</p>
        </div>
      )}
      
      {/* Usage instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-xs font-medium text-gray-700 mb-1">How to use:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Drag items from the left panel to the correct targets on the right</li>
          <li>• Drag items back to the left panel if you need to move them</li>
          <li>• Items will swap places if you drop on an occupied target</li>
        </ul>
      </div>
    </div>
  );
}
