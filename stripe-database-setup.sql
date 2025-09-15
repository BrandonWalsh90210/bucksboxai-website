-- ========================================
-- Stripe Connect データベース設定
-- BucksBox.ai 収益分配システム用
-- 作成日: 2025-01-15
-- ========================================

-- 1. Stripe連携アカウント管理テーブル
-- ユーザーのStripe Connectアカウント情報を保管
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_account_id VARCHAR(255) UNIQUE NOT NULL, -- Stripe側のアカウントID (acct_xxx)
    account_type VARCHAR(50) DEFAULT 'express', -- 'express' or 'standard' or 'custom'
    onboarding_completed BOOLEAN DEFAULT false, -- オンボーディング完了フラグ
    charges_enabled BOOLEAN DEFAULT false, -- 支払い受付可能フラグ
    payouts_enabled BOOLEAN DEFAULT false, -- 出金可能フラグ
    email VARCHAR(255),
    business_type VARCHAR(50), -- 'individual' or 'company'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成（検索速度向上）
CREATE INDEX idx_stripe_accounts_user_id ON public.stripe_accounts(user_id);
CREATE INDEX idx_stripe_accounts_stripe_id ON public.stripe_accounts(stripe_account_id);

-- 2. 支払い記録テーブル
-- 申請者への支払い履歴を記録
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_account_id VARCHAR(255) REFERENCES public.stripe_accounts(stripe_account_id),
    stripe_transfer_id VARCHAR(255) UNIQUE, -- Stripeの送金ID (tr_xxx)
    stripe_payout_id VARCHAR(255), -- Stripeの出金ID (po_xxx)
    amount DECIMAL(10,2) NOT NULL, -- 支払い金額
    currency VARCHAR(3) DEFAULT 'JPY', -- 通貨
    status VARCHAR(50) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    payment_type VARCHAR(50) NOT NULL, -- 'idea_reward' (アイデア報酬) or 'review_revenue' (審査代行収益)
    app_name VARCHAR(255),
    app_id VARCHAR(255),
    description TEXT, -- 支払い内容の説明
    period_start DATE, -- 対象期間開始
    period_end DATE, -- 対象期間終了
    error_message TEXT, -- エラーが発生した場合のメッセージ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE, -- 実際に支払われた日時
    metadata JSONB -- 追加情報を柔軟に保存
);

-- インデックス作成
CREATE INDEX idx_payment_records_user_id ON public.payment_records(user_id);
CREATE INDEX idx_payment_records_status ON public.payment_records(status);
CREATE INDEX idx_payment_records_created_at ON public.payment_records(created_at DESC);

-- 3. アプリ売上データテーブル
-- App Storeの売上データを管理
CREATE TABLE IF NOT EXISTS public.revenue_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id VARCHAR(255) NOT NULL, -- アプリの識別ID
    app_name VARCHAR(255) NOT NULL, -- アプリ名
    user_id UUID REFERENCES auth.users(id), -- 申請者のユーザーID
    submission_type VARCHAR(50) NOT NULL, -- 'idea' or 'review'
    period_year INTEGER NOT NULL, -- 年
    period_month INTEGER NOT NULL, -- 月
    downloads INTEGER DEFAULT 0, -- ダウンロード数
    gross_revenue DECIMAL(10,2) DEFAULT 0, -- 総売上
    apple_fee DECIMAL(10,2) DEFAULT 0, -- Apple手数料（30%）
    net_revenue DECIMAL(10,2) DEFAULT 0, -- 手数料控除後の売上
    user_share DECIMAL(10,2) DEFAULT 0, -- ユーザーの取り分
    platform_share DECIMAL(10,2) DEFAULT 0, -- プラットフォームの取り分
    share_percentage DECIMAL(5,2), -- 分配率（18% or 55%）
    is_processed BOOLEAN DEFAULT false, -- 支払い処理済みフラグ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT -- メモ欄
);

-- インデックス作成
CREATE INDEX idx_revenue_data_app_id ON public.revenue_data(app_id);
CREATE INDEX idx_revenue_data_period ON public.revenue_data(period_year, period_month);
CREATE INDEX idx_revenue_data_processed ON public.revenue_data(is_processed);

-- 4. Stripeイベントログテーブル
-- Webhookイベントの重複処理を防ぐため
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL, -- Stripeのイベントのインテグリティ (evt_xxx)
    event_type VARCHAR(100) NOT NULL, -- 'account.updated', 'transfer.created' など
    processed BOOLEAN DEFAULT false,
    data JSONB, -- イベントの詳細データ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_stripe_events_stripe_id ON public.stripe_events(stripe_event_id);
CREATE INDEX idx_stripe_events_created_at ON public.stripe_events(created_at DESC);

-- 5. 支払い設定テーブル
-- 最低支払い金額などの設定を管理
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- デフォルト設定の挿入
INSERT INTO public.payment_settings (setting_key, setting_value, description) VALUES
    ('min_payout_idea', '{"amount": 1000, "currency": "JPY"}', 'アイデア申請の最低支払い金額'),
    ('min_payout_review', '{"amount": 3000, "currency": "JPY"}', '審査代行の最低支払い金額'),
    ('idea_share_percentage', '{"percentage": 18}', 'アイデア申請の収益分配率'),
    ('review_share_percentage', '{"percentage": 55}', '審査代行の収益分配率')
ON CONFLICT (setting_key) DO NOTHING;

-- ========================================
-- Row Level Security (RLS) ポリシー設定
-- ========================================

-- RLSを有効化
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- stripe_accounts ポリシー
-- ユーザーは自分のアカウント情報のみ参照可能
CREATE POLICY "Users can view own stripe account" ON public.stripe_accounts
    FOR SELECT USING (auth.uid() = user_id);

-- 管理者は全て参照・更新可能（後で管理者ロールを追加）
CREATE POLICY "Service role can manage all stripe accounts" ON public.stripe_accounts
    FOR ALL USING (auth.role() = 'service_role');

-- payment_records ポリシー
-- ユーザーは自分の支払い記録のみ参照可能
CREATE POLICY "Users can view own payment records" ON public.payment_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all payment records" ON public.payment_records
    FOR ALL USING (auth.role() = 'service_role');

-- revenue_data ポリシー
-- ユーザーは自分の売上データのみ参照可能
CREATE POLICY "Users can view own revenue data" ON public.revenue_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all revenue data" ON public.revenue_data
    FOR ALL USING (auth.role() = 'service_role');

-- stripe_events ポリシー
-- サービスロールのみアクセス可能
CREATE POLICY "Service role can manage stripe events" ON public.stripe_events
    FOR ALL USING (auth.role() = 'service_role');

-- payment_settings ポリシー
-- 全員が読み取り可能、サービスロールのみ更新可能
CREATE POLICY "Anyone can read payment settings" ON public.payment_settings
    FOR SELECT USING (true);

CREATE POLICY "Service role can update payment settings" ON public.payment_settings
    FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- ヘルパー関数
-- ========================================

-- 収益分配額を計算する関数
CREATE OR REPLACE FUNCTION calculate_revenue_share(
    gross_amount DECIMAL,
    share_type VARCHAR
) RETURNS JSONB AS $$
DECLARE
    apple_fee DECIMAL;
    net_amount DECIMAL;
    share_percentage DECIMAL;
    user_share DECIMAL;
    platform_share DECIMAL;
BEGIN
    -- Apple手数料を計算（30%）
    apple_fee := gross_amount * 0.30;
    net_amount := gross_amount - apple_fee;

    -- 分配率を取得
    IF share_type = 'idea' THEN
        share_percentage := 18; -- アイデア申請は18%
    ELSIF share_type = 'review' THEN
        share_percentage := 55; -- 審査代行は55%
    ELSE
        RAISE EXCEPTION 'Invalid share type: %', share_type;
    END IF;

    -- 分配額を計算
    user_share := net_amount * (share_percentage / 100);
    platform_share := net_amount - user_share;

    RETURN jsonb_build_object(
        'gross_amount', gross_amount,
        'apple_fee', apple_fee,
        'net_amount', net_amount,
        'share_percentage', share_percentage,
        'user_share', user_share,
        'platform_share', platform_share
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 実行完了メッセージ
-- ========================================
-- このSQLを実行後、以下のテーブルが作成されます：
-- 1. stripe_accounts - Stripe Connectアカウント情報
-- 2. payment_records - 支払い履歴
-- 3. revenue_data - 売上データ
-- 4. stripe_events - Webhookイベントログ
-- 5. payment_settings - 支払い設定
--
-- 次のステップ：
-- 1. Supabase ダッシュボードでこのSQLを実行
-- 2. テーブルが正しく作成されたか確認
-- 3. RLSポリシーが適用されているか確認