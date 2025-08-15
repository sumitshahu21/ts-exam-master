-- Fix Foreign Key Constraint for results table
-- Drop old constraint that points to test_attempts and create new one pointing to testAttempt

-- Step 1: Check current constraints
SELECT 
    fk.name AS constraint_name,
    OBJECT_NAME(fk.parent_object_id) AS table_name,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS column_name,
    OBJECT_NAME(fk.referenced_object_id) AS referenced_table,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS referenced_column
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'results';

-- Step 2: Drop the problematic constraint (adjust constraint name based on above query)
-- ALTER TABLE results DROP CONSTRAINT [FK__results__attempt__634EBE90];

-- Step 3: Clean up any orphaned records (optional, but recommended)
DELETE FROM results 
WHERE attempt_id NOT IN (SELECT id FROM testAttempt);

-- Step 4: Create new foreign key constraint pointing to testAttempt
ALTER TABLE results
ADD CONSTRAINT FK_results_testAttempt
FOREIGN KEY (attempt_id) REFERENCES testAttempt(id);

-- Step 5: Verify the new constraint
SELECT 
    fk.name AS constraint_name,
    OBJECT_NAME(fk.parent_object_id) AS table_name,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS column_name,
    OBJECT_NAME(fk.referenced_object_id) AS referenced_table,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS referenced_column
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'results';
