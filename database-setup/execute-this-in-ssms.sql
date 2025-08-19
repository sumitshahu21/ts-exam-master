/****** Object:  Database [exam_db]    Script Date: 19-08-2025 13:27:03 ******/
CREATE DATABASE [exam_db]  (EDITION = 'Basic', SERVICE_OBJECTIVE = 'Basic', MAXSIZE = 1 GB) WITH CATALOG_COLLATION = SQL_Latin1_General_CP1_CI_AS, LEDGER = OFF;
GO
ALTER DATABASE [exam_db] SET COMPATIBILITY_LEVEL = 170
GO
ALTER DATABASE [exam_db] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [exam_db] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [exam_db] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [exam_db] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [exam_db] SET ARITHABORT OFF 
GO
ALTER DATABASE [exam_db] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [exam_db] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [exam_db] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [exam_db] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [exam_db] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [exam_db] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [exam_db] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [exam_db] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [exam_db] SET ALLOW_SNAPSHOT_ISOLATION ON 
GO
ALTER DATABASE [exam_db] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [exam_db] SET READ_COMMITTED_SNAPSHOT ON 
GO
ALTER DATABASE [exam_db] SET  MULTI_USER 
GO
ALTER DATABASE [exam_db] SET ENCRYPTION ON
GO
ALTER DATABASE [exam_db] SET QUERY_STORE = ON
GO
ALTER DATABASE [exam_db] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 7), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 10, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO, MAX_PLANS_PER_QUERY = 200, WAIT_STATS_CAPTURE_MODE = ON)
GO
/*** The scripts of database scoped configurations in Azure should be executed inside the target database connection. ***/
GO
-- ALTER DATABASE SCOPED CONFIGURATION SET MAXDOP = 8;
GO
/****** Object:  Table [dbo].[admin_invite_codes]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[admin_invite_codes](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[code] [nvarchar](50) NOT NULL,
	[is_used] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[used_at] [datetime2](7) NULL,
	[used_by] [int] NULL,
	[created_by] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[code] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[answers]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[answers](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[attempt_id] [int] NOT NULL,
	[question_id] [int] NOT NULL,
	[answer_data] [text] NULL,
	[is_correct] [bit] NULL,
	[marks_obtained] [decimal](5, 2) NULL,
	[created_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[demo_users]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[demo_users](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[username] [varchar](50) NOT NULL,
	[email] [varchar](100) NOT NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[exams]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[exams](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[title] [varchar](255) NOT NULL,
	[subject] [varchar](100) NOT NULL,
	[description] [text] NULL,
	[instructions] [text] NULL,
	[duration] [int] NOT NULL,
	[total_marks] [int] NULL,
	[passing_marks] [int] NULL,
	[status] [varchar](20) NULL,
	[scheduled_start] [datetime2](7) NULL,
	[scheduled_end] [datetime2](7) NULL,
	[created_by] [int] NOT NULL,
	[created_at] [datetime2](7) NULL,
	[updated_at] [datetime2](7) NULL,
	[is_published] [bit] NULL,
	[scheduled_start_time] [datetime] NULL,
	[scheduled_end_time] [datetime] NULL,
	[randomize_questions] [bit] NULL,
	[allow_multiple_attempts] [bit] NULL,
	[questions] [text] NULL,
	[total_questions] [int] NULL,
	[passing_score] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[otp_attempts]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[otp_attempts](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[email] [varchar](255) NOT NULL,
	[attempt_count] [int] NULL,
	[last_attempt_at] [datetime2](7) NULL,
	[blocked_until] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[question_options]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[question_options](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[question_id] [int] NOT NULL,
	[option_text] [text] NOT NULL,
	[is_correct] [bit] NULL,
	[order_index] [int] NULL,
	[created_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[questions]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[questions](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[exam_id] [int] NOT NULL,
	[question_type] [varchar](20) NOT NULL,
	[marks] [int] NULL,
	[order_index] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[question_data] [nvarchar](max) NOT NULL,
	[is_active] [bit] NOT NULL,
	[updated_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[questions_backup]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[questions_backup](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[exam_id] [int] NOT NULL,
	[question_text] [text] NOT NULL,
	[question_type] [varchar](20) NOT NULL,
	[marks] [int] NULL,
	[order_index] [int] NULL,
	[case_study_content] [text] NULL,
	[code_template] [text] NULL,
	[metadata] [text] NULL,
	[created_at] [datetime2](7) NULL,
	[question_data] [nvarchar](max) NOT NULL,
	[is_active] [bit] NOT NULL,
	[explanation] [nvarchar](max) NULL,
	[updated_at] [datetime] NOT NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[results]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[results](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[attempt_id] [int] NOT NULL,
	[total_questions] [int] NOT NULL,
	[correct_answers] [int] NULL,
	[wrong_answers] [int] NULL,
	[unanswered] [int] NULL,
	[total_marks] [decimal](5, 2) NOT NULL,
	[obtained_marks] [decimal](5, 2) NULL,
	[percentage] [decimal](5, 2) NULL,
	[grade] [varchar](10) NULL,
	[status] [varchar](20) NULL,
	[created_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[attempt_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[security_violations]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[security_violations](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[attempt_id] [int] NOT NULL,
	[user_id] [int] NOT NULL,
	[exam_id] [int] NOT NULL,
	[violation_type] [varchar](50) NOT NULL,
	[details] [nvarchar](max) NULL,
	[violation_timestamp] [datetime2](7) NOT NULL,
	[created_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[studentAnswer]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[studentAnswer](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[attempt_id] [int] NOT NULL,
	[question_id] [int] NOT NULL,
	[is_correct] [bit] NULL,
	[marks_obtained] [decimal](5, 2) NOT NULL,
	[student_answer] [nvarchar](max) NOT NULL,
	[created_at] [datetime2](7) NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UK_studentAnswer_attempt_question] UNIQUE NONCLUSTERED 
(
	[attempt_id] ASC,
	[question_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[test_attempts]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[test_attempts](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[exam_id] [int] NOT NULL,
	[user_id] [int] NOT NULL,
	[status] [varchar](20) NULL,
	[started_at] [datetime2](7) NULL,
	[completed_at] [datetime2](7) NULL,
	[time_taken] [int] NULL,
	[total_score] [decimal](5, 2) NULL,
	[percentage] [decimal](5, 2) NULL,
	[created_at] [datetime2](7) NULL,
	[start_time] [datetime] NOT NULL,
	[end_time] [datetime] NULL,
	[is_submitted] [bit] NOT NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[testAttempt]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[testAttempt](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[exam_id] [int] NOT NULL,
	[user_id] [int] NOT NULL,
	[status] [varchar](20) NULL,
	[time_taken] [int] NOT NULL,
	[total_score] [decimal](5, 2) NULL,
	[percentage] [decimal](5, 2) NULL,
	[created_at] [datetime2](7) NULL,
	[start_time] [datetime] NOT NULL,
	[end_time] [datetime] NULL,
	[is_submitted] [bit] NOT NULL,
	[updated_at] [datetime] NULL,
	[is_auto_expired] [bit] NULL,
	[is_auto_ended] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[users]    Script Date: 19-08-2025 13:27:03 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[users](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[email] [varchar](255) NOT NULL,
	[password_hash] [varchar](255) NOT NULL,
	[first_name] [varchar](100) NOT NULL,
	[last_name] [varchar](100) NOT NULL,
	[role] [varchar](20) NULL,
	[profile_photo] [varchar](500) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[updated_at] [datetime2](7) NULL,
	[otp_code] [varchar](6) NULL,
	[otp_expires_at] [datetime2](7) NULL,
	[is_email_verified] [bit] NULL,
	[email_verified_at] [datetime2](7) NULL,
	[reset_password_otp] [varchar](6) NULL,
	[reset_password_expires] [datetime2](7) NULL,
	[password_reset_attempts] [int] NULL,
	[last_password_reset_attempt] [datetime2](7) NULL,
	[admin_code_used] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[email] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_admin_invite_codes_code]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_admin_invite_codes_code] ON [dbo].[admin_invite_codes]
(
	[code] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_email_attempts]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [idx_email_attempts] ON [dbo].[otp_attempts]
(
	[email] ASC,
	[last_attempt_at] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_questions_exam_id]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_questions_exam_id] ON [dbo].[questions]
(
	[exam_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_questions_order]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_questions_order] ON [dbo].[questions]
(
	[exam_id] ASC,
	[order_index] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_questions_type]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_questions_type] ON [dbo].[questions]
(
	[question_type] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_studentAnswer_attempt]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_studentAnswer_attempt] ON [dbo].[studentAnswer]
(
	[attempt_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_studentAnswer_is_correct]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_studentAnswer_is_correct] ON [dbo].[studentAnswer]
(
	[is_correct] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_studentAnswer_question]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_studentAnswer_question] ON [dbo].[studentAnswer]
(
	[question_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_test_attempts_user_exam]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_test_attempts_user_exam] ON [dbo].[test_attempts]
(
	[user_id] ASC,
	[exam_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_testAttempt_created_at]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_testAttempt_created_at] ON [dbo].[testAttempt]
(
	[created_at] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_testAttempt_status]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_testAttempt_status] ON [dbo].[testAttempt]
(
	[status] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_testAttempt_user_exam]    Script Date: 19-08-2025 13:27:04 ******/
CREATE NONCLUSTERED INDEX [IX_testAttempt_user_exam] ON [dbo].[testAttempt]
(
	[user_id] ASC,
	[exam_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[admin_invite_codes] ADD  DEFAULT ((0)) FOR [is_used]
GO
ALTER TABLE [dbo].[admin_invite_codes] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[answers] ADD  DEFAULT ((0)) FOR [is_correct]
GO
ALTER TABLE [dbo].[answers] ADD  DEFAULT ((0)) FOR [marks_obtained]
GO
ALTER TABLE [dbo].[answers] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[demo_users] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[exams] ADD  DEFAULT ((0)) FOR [total_marks]
GO
ALTER TABLE [dbo].[exams] ADD  DEFAULT ((0)) FOR [passing_marks]
GO
ALTER TABLE [dbo].[exams] ADD  DEFAULT ('draft') FOR [status]
GO
ALTER TABLE [dbo].[exams] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[exams] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[exams] ADD  DEFAULT ((0)) FOR [is_published]
GO
ALTER TABLE [dbo].[exams] ADD  DEFAULT ((0)) FOR [randomize_questions]
GO
ALTER TABLE [dbo].[exams] ADD  DEFAULT ((0)) FOR [allow_multiple_attempts]
GO
ALTER TABLE [dbo].[exams] ADD  DEFAULT ((0)) FOR [total_questions]
GO
ALTER TABLE [dbo].[exams] ADD  DEFAULT ((60)) FOR [passing_score]
GO
ALTER TABLE [dbo].[otp_attempts] ADD  DEFAULT ((1)) FOR [attempt_count]
GO
ALTER TABLE [dbo].[otp_attempts] ADD  DEFAULT (getdate()) FOR [last_attempt_at]
GO
ALTER TABLE [dbo].[otp_attempts] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[question_options] ADD  DEFAULT ((0)) FOR [is_correct]
GO
ALTER TABLE [dbo].[question_options] ADD  DEFAULT ((0)) FOR [order_index]
GO
ALTER TABLE [dbo].[question_options] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[questions] ADD  DEFAULT ((1)) FOR [marks]
GO
ALTER TABLE [dbo].[questions] ADD  DEFAULT ((0)) FOR [order_index]
GO
ALTER TABLE [dbo].[questions] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[questions] ADD  DEFAULT ('{}') FOR [question_data]
GO
ALTER TABLE [dbo].[questions] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[questions] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[results] ADD  DEFAULT ((0)) FOR [correct_answers]
GO
ALTER TABLE [dbo].[results] ADD  DEFAULT ((0)) FOR [wrong_answers]
GO
ALTER TABLE [dbo].[results] ADD  DEFAULT ((0)) FOR [unanswered]
GO
ALTER TABLE [dbo].[results] ADD  DEFAULT ((0)) FOR [obtained_marks]
GO
ALTER TABLE [dbo].[results] ADD  DEFAULT ((0)) FOR [percentage]
GO
ALTER TABLE [dbo].[results] ADD  DEFAULT ('fail') FOR [status]
GO
ALTER TABLE [dbo].[results] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[security_violations] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[studentAnswer] ADD  DEFAULT ((0)) FOR [is_correct]
GO
ALTER TABLE [dbo].[studentAnswer] ADD  DEFAULT ((0.00)) FOR [marks_obtained]
GO
ALTER TABLE [dbo].[studentAnswer] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[studentAnswer] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[test_attempts] ADD  DEFAULT ('in_progress') FOR [status]
GO
ALTER TABLE [dbo].[test_attempts] ADD  DEFAULT (getdate()) FOR [started_at]
GO
ALTER TABLE [dbo].[test_attempts] ADD  DEFAULT ((0)) FOR [total_score]
GO
ALTER TABLE [dbo].[test_attempts] ADD  DEFAULT ((0)) FOR [percentage]
GO
ALTER TABLE [dbo].[test_attempts] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[test_attempts] ADD  DEFAULT ((0)) FOR [is_submitted]
GO
ALTER TABLE [dbo].[testAttempt] ADD  DEFAULT ('in_progress') FOR [status]
GO
ALTER TABLE [dbo].[testAttempt] ADD  DEFAULT ((0)) FOR [time_taken]
GO
ALTER TABLE [dbo].[testAttempt] ADD  DEFAULT ((0.00)) FOR [total_score]
GO
ALTER TABLE [dbo].[testAttempt] ADD  DEFAULT ((0.00)) FOR [percentage]
GO
ALTER TABLE [dbo].[testAttempt] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[testAttempt] ADD  DEFAULT ((0)) FOR [is_submitted]
GO
ALTER TABLE [dbo].[testAttempt] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[testAttempt] ADD  DEFAULT ((0)) FOR [is_auto_expired]
GO
ALTER TABLE [dbo].[testAttempt] ADD  DEFAULT ((0)) FOR [is_auto_ended]
GO
ALTER TABLE [dbo].[users] ADD  DEFAULT ('student') FOR [role]
GO
ALTER TABLE [dbo].[users] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[users] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[users] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [is_email_verified]
GO
ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [password_reset_attempts]
GO
ALTER TABLE [dbo].[admin_invite_codes]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO
ALTER TABLE [dbo].[admin_invite_codes]  WITH CHECK ADD FOREIGN KEY([used_by])
REFERENCES [dbo].[users] ([id])
GO
ALTER TABLE [dbo].[answers]  WITH CHECK ADD FOREIGN KEY([attempt_id])
REFERENCES [dbo].[test_attempts] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[answers]  WITH CHECK ADD FOREIGN KEY([question_id])
REFERENCES [dbo].[questions] ([id])
GO
ALTER TABLE [dbo].[exams]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[users] ([id])
GO
ALTER TABLE [dbo].[question_options]  WITH CHECK ADD FOREIGN KEY([question_id])
REFERENCES [dbo].[questions] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[results]  WITH CHECK ADD  CONSTRAINT [FK_results_attempt_id_testAttempt] FOREIGN KEY([attempt_id])
REFERENCES [dbo].[testAttempt] ([id])
GO
ALTER TABLE [dbo].[results] CHECK CONSTRAINT [FK_results_attempt_id_testAttempt]
GO
ALTER TABLE [dbo].[results]  WITH CHECK ADD  CONSTRAINT [FK_results_testAttempt] FOREIGN KEY([attempt_id])
REFERENCES [dbo].[testAttempt] ([id])
GO
ALTER TABLE [dbo].[results] CHECK CONSTRAINT [FK_results_testAttempt]
GO
ALTER TABLE [dbo].[security_violations]  WITH CHECK ADD FOREIGN KEY([attempt_id])
REFERENCES [dbo].[testAttempt] ([id])
GO
ALTER TABLE [dbo].[security_violations]  WITH CHECK ADD FOREIGN KEY([exam_id])
REFERENCES [dbo].[exams] ([id])
GO
ALTER TABLE [dbo].[security_violations]  WITH CHECK ADD FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([id])
GO
ALTER TABLE [dbo].[studentAnswer]  WITH CHECK ADD  CONSTRAINT [FK_studentAnswer_attempt] FOREIGN KEY([attempt_id])
REFERENCES [dbo].[testAttempt] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[studentAnswer] CHECK CONSTRAINT [FK_studentAnswer_attempt]
GO
ALTER TABLE [dbo].[studentAnswer]  WITH CHECK ADD  CONSTRAINT [FK_studentAnswer_question] FOREIGN KEY([question_id])
REFERENCES [dbo].[questions] ([id])
GO
ALTER TABLE [dbo].[studentAnswer] CHECK CONSTRAINT [FK_studentAnswer_question]
GO
ALTER TABLE [dbo].[test_attempts]  WITH CHECK ADD FOREIGN KEY([exam_id])
REFERENCES [dbo].[exams] ([id])
GO
ALTER TABLE [dbo].[test_attempts]  WITH CHECK ADD FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([id])
GO
ALTER TABLE [dbo].[testAttempt]  WITH CHECK ADD  CONSTRAINT [FK_testAttempt_exam] FOREIGN KEY([exam_id])
REFERENCES [dbo].[exams] ([id])
GO
ALTER TABLE [dbo].[testAttempt] CHECK CONSTRAINT [FK_testAttempt_exam]
GO
ALTER TABLE [dbo].[testAttempt]  WITH CHECK ADD  CONSTRAINT [FK_testAttempt_user] FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([id])
GO
ALTER TABLE [dbo].[testAttempt] CHECK CONSTRAINT [FK_testAttempt_user]
GO
ALTER TABLE [dbo].[exams]  WITH CHECK ADD CHECK  (([status]='archived' OR [status]='published' OR [status]='draft'))
GO
ALTER TABLE [dbo].[questions]  WITH CHECK ADD CHECK  (([question_type]='code' OR [question_type]='short-answer' OR [question_type]='case-study' OR [question_type]='drag-drop' OR [question_type]='multiple-choice' OR [question_type]='single-choice'))
GO
ALTER TABLE [dbo].[results]  WITH CHECK ADD CHECK  (([status]='fail' OR [status]='pass'))
GO
ALTER TABLE [dbo].[test_attempts]  WITH CHECK ADD CHECK  (([status]='abandoned' OR [status]='completed' OR [status]='in_progress'))
GO
ALTER TABLE [dbo].[users]  WITH CHECK ADD CHECK  (([role]='admin' OR [role]='student'))
GO
ALTER DATABASE [exam_db] SET  READ_WRITE 
GO
