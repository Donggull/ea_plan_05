-- Q&A 시스템 테이블 생성
-- 일반적인 질문-답변 시스템을 위한 스키마

-- 1. Q&A 대화 테이블
CREATE TABLE IF NOT EXISTS qa_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
    is_public BOOLEAN NOT NULL DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Q&A 메시지 테이블
CREATE TABLE IF NOT EXISTS qa_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES qa_conversations(id) ON DELETE CASCADE,
    parent_message_id UUID REFERENCES qa_messages(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'question' CHECK (type IN ('question', 'answer', 'comment', 'system')),
    content TEXT NOT NULL,
    content_format TEXT DEFAULT 'text' CHECK (content_format IN ('text', 'markdown', 'html')),

    -- AI 관련
    is_ai_generated BOOLEAN DEFAULT false,
    ai_model TEXT,
    ai_provider TEXT,
    ai_confidence DECIMAL(3,2),
    processing_time INTEGER, -- milliseconds
    input_tokens INTEGER,
    output_tokens INTEGER,
    ai_cost DECIMAL(10,6),

    -- 사용자 상호작용
    votes_up INTEGER DEFAULT 0,
    votes_down INTEGER DEFAULT 0,
    is_marked_as_answer BOOLEAN DEFAULT false,
    is_helpful BOOLEAN DEFAULT false,

    -- 메타데이터
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    user_role TEXT,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Q&A 첨부파일 테이블
CREATE TABLE IF NOT EXISTS qa_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES qa_messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Q&A 투표 테이블
CREATE TABLE IF NOT EXISTS qa_message_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES qa_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- 5. Q&A 알림 테이블
CREATE TABLE IF NOT EXISTS qa_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES qa_conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES qa_messages(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_question', 'new_answer', 'mention', 'vote', 'marked_as_answer')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Q&A 참여자 테이블 (구독/팔로우)
CREATE TABLE IF NOT EXISTS qa_conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES qa_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'participant' CHECK (role IN ('creator', 'moderator', 'participant')),
    is_subscribed BOOLEAN DEFAULT true,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_qa_conversations_project_id ON qa_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_conversations_status ON qa_conversations(status);
CREATE INDEX IF NOT EXISTS idx_qa_conversations_created_by ON qa_conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_qa_conversations_tags ON qa_conversations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_qa_conversations_created_at ON qa_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qa_messages_conversation_id ON qa_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_qa_messages_parent_id ON qa_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_qa_messages_user_id ON qa_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_messages_type ON qa_messages(type);
CREATE INDEX IF NOT EXISTS idx_qa_messages_created_at ON qa_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_messages_is_ai ON qa_messages(is_ai_generated);

CREATE INDEX IF NOT EXISTS idx_qa_attachments_message_id ON qa_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_qa_votes_message_id ON qa_message_votes(message_id);
CREATE INDEX IF NOT EXISTS idx_qa_votes_user_id ON qa_message_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_qa_notifications_user_id ON qa_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_notifications_unread ON qa_notifications(user_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_qa_participants_conversation_id ON qa_conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_qa_participants_user_id ON qa_conversation_participants(user_id);

-- 트리거 함수: 메시지 수 업데이트
CREATE OR REPLACE FUNCTION update_qa_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE qa_conversations SET
            message_count = message_count + 1,
            last_message_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE qa_conversations SET
            message_count = GREATEST(message_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 함수: 투표 수 업데이트
CREATE OR REPLACE FUNCTION update_qa_message_votes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'up' THEN
            UPDATE qa_messages SET votes_up = votes_up + 1 WHERE id = NEW.message_id;
        ELSE
            UPDATE qa_messages SET votes_down = votes_down + 1 WHERE id = NEW.message_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'up' THEN
            UPDATE qa_messages SET votes_up = GREATEST(votes_up - 1, 0) WHERE id = OLD.message_id;
        ELSE
            UPDATE qa_messages SET votes_down = GREATEST(votes_down - 1, 0) WHERE id = OLD.message_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 투표 변경 시
        IF OLD.vote_type = 'up' THEN
            UPDATE qa_messages SET votes_up = GREATEST(votes_up - 1, 0) WHERE id = OLD.message_id;
        ELSE
            UPDATE qa_messages SET votes_down = GREATEST(votes_down - 1, 0) WHERE id = OLD.message_id;
        END IF;

        IF NEW.vote_type = 'up' THEN
            UPDATE qa_messages SET votes_up = votes_up + 1 WHERE id = NEW.message_id;
        ELSE
            UPDATE qa_messages SET votes_down = votes_down + 1 WHERE id = NEW.message_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_qa_conversation_stats
    AFTER INSERT OR DELETE ON qa_messages
    FOR EACH ROW EXECUTE FUNCTION update_qa_conversation_stats();

CREATE TRIGGER trigger_qa_message_votes_count
    AFTER INSERT OR UPDATE OR DELETE ON qa_message_votes
    FOR EACH ROW EXECUTE FUNCTION update_qa_message_votes_count();

-- RLS 정책 활성화
ALTER TABLE qa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_message_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_conversation_participants ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (프로젝트 기반 접근 제어)
CREATE POLICY "QA conversations access" ON qa_conversations
FOR ALL
USING (
    project_id IN (
        SELECT id FROM projects
        WHERE owner_id = auth.uid()
           OR id IN (
               SELECT project_id FROM project_members
               WHERE user_id = auth.uid()
           )
    )
    OR is_public = true
)
WITH CHECK (
    project_id IN (
        SELECT id FROM projects
        WHERE owner_id = auth.uid()
           OR id IN (
               SELECT project_id FROM project_members
               WHERE user_id = auth.uid()
           )
    )
);

CREATE POLICY "QA messages access" ON qa_messages
FOR ALL
USING (
    conversation_id IN (
        SELECT id FROM qa_conversations
        WHERE project_id IN (
            SELECT id FROM projects
            WHERE owner_id = auth.uid()
               OR id IN (
                   SELECT project_id FROM project_members
                   WHERE user_id = auth.uid()
               )
        )
        OR is_public = true
    )
)
WITH CHECK (
    conversation_id IN (
        SELECT id FROM qa_conversations
        WHERE project_id IN (
            SELECT id FROM projects
            WHERE owner_id = auth.uid()
               OR id IN (
                   SELECT project_id FROM project_members
                   WHERE user_id = auth.uid()
               )
        )
    )
);

CREATE POLICY "QA attachments access" ON qa_attachments
FOR ALL
USING (
    message_id IN (
        SELECT id FROM qa_messages
        WHERE conversation_id IN (
            SELECT id FROM qa_conversations
            WHERE project_id IN (
                SELECT id FROM projects
                WHERE owner_id = auth.uid()
                   OR id IN (
                       SELECT project_id FROM project_members
                       WHERE user_id = auth.uid()
                   )
            )
            OR is_public = true
        )
    )
);

CREATE POLICY "QA votes access" ON qa_message_votes
FOR ALL
USING (
    message_id IN (
        SELECT id FROM qa_messages
        WHERE conversation_id IN (
            SELECT id FROM qa_conversations
            WHERE project_id IN (
                SELECT id FROM projects
                WHERE owner_id = auth.uid()
                   OR id IN (
                       SELECT project_id FROM project_members
                       WHERE user_id = auth.uid()
                   )
            )
            OR is_public = true
        )
    )
);

CREATE POLICY "QA notifications own only" ON qa_notifications
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "QA participants access" ON qa_conversation_participants
FOR ALL
USING (
    conversation_id IN (
        SELECT id FROM qa_conversations
        WHERE project_id IN (
            SELECT id FROM projects
            WHERE owner_id = auth.uid()
               OR id IN (
                   SELECT project_id FROM project_members
                   WHERE user_id = auth.uid()
               )
        )
        OR is_public = true
    )
);