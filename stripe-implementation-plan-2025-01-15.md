# 📋 Stripe決済システム実装計画書
**作成日:** 2025年1月15日  
**プロジェクト:** BucksBox.ai 収益分配システム

---

## 🎯 実装目標
申請者の個人情報（銀行口座等）を直接扱わずに、Stripe Connectを利用した自動収益分配システムを構築する

---

## 💰 Stripe料金体系（確認済み）
- **初期費用:** 無料
- **月額費用:** 無料  
- **決済手数料:** 3.6%（日本国内）
- **Stripe Connect追加料金:**
  - プラットフォーム手数料: $2/月額アクティブアカウント + 0.25% + 25¢
  - 振込手数料: 1.5%

---

## 📅 実装スケジュール

### **Phase 1: 基礎準備（2025年1月16日〜1月18日）**

#### Day 1: Stripeアカウント設定
- [ ] BucksBox.ai用Stripeビジネスアカウント作成
- [ ] 本人確認書類提出
- [ ] ビジネス情報登録
- [ ] Stripe Connect有効化

#### Day 2: 開発環境構築
- [ ] Stripe APIキー取得（テスト環境）
- [ ] Stripe SDKインストール
```bash
npm install stripe @stripe/stripe-js
```
- [ ] 環境変数設定（.env）
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Day 3: データベース設計
```sql
-- Stripe連携用テーブル
CREATE TABLE stripe_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    stripe_account_id VARCHAR(255) UNIQUE,
    account_type VARCHAR(50), -- 'express' or 'standard'
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 支払い記録テーブル
CREATE TABLE payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    stripe_transfer_id VARCHAR(255),
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'JPY',
    status VARCHAR(50), -- 'pending', 'completed', 'failed'
    payment_type VARCHAR(50), -- 'idea_reward', 'review_revenue'
    app_name VARCHAR(255),
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 売上データテーブル
CREATE TABLE revenue_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id VARCHAR(255),
    app_name VARCHAR(255),
    period DATE,
    downloads INTEGER,
    gross_revenue DECIMAL(10,2),
    apple_fee DECIMAL(10,2),
    net_revenue DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### **Phase 2: フォーム改修（2025年1月19日〜1月22日）**

#### Day 4-5: 申請フォームUI改修

**idea_application.html に追加:**
```html
<!-- Stripe Connect セクション -->
<div class="form-section" id="payment-setup-section">
    <h2 class="section-title">
        <span class="section-icon">💳</span>
        報酬受取設定
    </h2>
    
    <div class="stripe-connect-container">
        <p class="info-text">
            報酬を受け取るには、Stripe経由での本人確認が必要です。
            銀行口座情報は直接Stripeに保管され、当社では保持しません。
        </p>
        
        <button type="button" id="stripe-connect-button" class="stripe-button">
            <img src="https://stripe.com/img/connect/light-on-dark.png" alt="Stripe Connect">
        </button>
        
        <div id="stripe-status" class="status-message" style="display: none;">
            <span class="success-icon">✅</span>
            Stripe連携が完了しました
        </div>
    </div>
    
    <input type="hidden" id="stripe_account_id" name="stripe_account_id">
</div>
```

**JavaScript実装:**
```javascript
// Stripe Connect連携
document.getElementById('stripe-connect-button').addEventListener('click', async () => {
    try {
        // バックエンドAPIを呼び出してConnect URLを取得
        const response = await fetch('/api/stripe/create-connect-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                return_url: window.location.href,
                refresh_url: window.location.href
            })
        });
        
        const { url, account_id } = await response.json();
        
        // Stripe Connectオンボーディングページへリダイレクト
        window.location.href = url;
        
    } catch (error) {
        console.error('Stripe Connect Error:', error);
        alert('連携処理中にエラーが発生しました');
    }
});
```

#### Day 6: Supabase Edge Functions作成

**supabase/functions/stripe-connect/index.ts:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const { email, return_url, refresh_url } = await req.json()

  try {
    // Stripe Expressアカウント作成
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'JP',
      email: email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
    })

    // オンボーディングリンク作成
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refresh_url,
      return_url: return_url,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({ 
        url: accountLink.url, 
        account_id: account.id 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    )
  }
})
```

---

### **Phase 3: 収益分配システム（2025年1月23日〜1月29日）**

#### Day 7-8: 収益計算ロジック実装

**supabase/functions/calculate-revenue/index.ts:**
```typescript
interface RevenueCalculation {
  app_name: string
  gross_revenue: number
  apple_fee: number
  net_revenue: number
  distribution_type: 'idea' | 'review'
  user_share: number
  bucksbox_share: number
}

function calculateRevenue(
  grossRevenue: number,
  type: 'idea' | 'review'
): RevenueCalculation {
  const appleFee = grossRevenue * 0.30 // Apple手数料30%
  const netRevenue = grossRevenue - appleFee
  
  let userShare = 0
  let bucksboxShare = 0
  
  if (type === 'idea') {
    // アイデア申請: 初月のみ18%
    userShare = netRevenue * 0.18
    bucksboxShare = netRevenue * 0.82
  } else {
    // 審査代行: 継続的に55%
    userShare = netRevenue * 0.55
    bucksboxShare = netRevenue * 0.45
  }
  
  return {
    gross_revenue: grossRevenue,
    apple_fee: appleFee,
    net_revenue: netRevenue,
    distribution_type: type,
    user_share: userShare,
    bucksbox_share: bucksboxShare
  }
}
```

#### Day 9-10: 自動支払い処理

**supabase/functions/process-payments/index.ts:**
```typescript
async function processPayment(
  stripeAccountId: string,
  amount: number,
  description: string
) {
  try {
    // Stripeで送金処理
    const transfer = await stripe.transfers.create({
      amount: Math.floor(amount), // 円単位（小数点以下切り捨て）
      currency: 'jpy',
      destination: stripeAccountId,
      description: description,
    })
    
    // 支払い記録をデータベースに保存
    const { error } = await supabase
      .from('payment_records')
      .insert({
        stripe_transfer_id: transfer.id,
        stripe_account_id: stripeAccountId,
        amount: amount,
        status: 'completed',
        payment_type: description.includes('アイデア') ? 'idea_reward' : 'review_revenue'
      })
    
    return transfer
  } catch (error) {
    console.error('Payment failed:', error)
    throw error
  }
}
```

---

### **Phase 4: 管理画面構築（2025年1月30日〜2月5日）**

#### Day 11-12: 管理者ダッシュボード

**admin-dashboard.html:**
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <title>BucksBox Admin - 収益管理</title>
</head>
<body>
    <!-- 売上入力フォーム -->
    <section id="revenue-input">
        <h2>売上データ入力</h2>
        <form id="revenue-form">
            <select name="app_id" required>
                <option value="">アプリを選択</option>
                <!-- 動的に生成 -->
            </select>
            <input type="date" name="period" required>
            <input type="number" name="downloads" placeholder="ダウンロード数">
            <input type="number" name="gross_revenue" placeholder="総売上（円）">
            <button type="submit">計算・保存</button>
        </form>
    </section>
    
    <!-- 支払い承認 -->
    <section id="payment-approval">
        <h2>支払い承認待ち</h2>
        <table id="pending-payments">
            <thead>
                <tr>
                    <th>申請者</th>
                    <th>アプリ名</th>
                    <th>支払額</th>
                    <th>種別</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                <!-- 動的に生成 -->
            </tbody>
        </table>
    </section>
    
    <!-- 支払い履歴 -->
    <section id="payment-history">
        <h2>支払い履歴</h2>
        <table>
            <thead>
                <tr>
                    <th>日付</th>
                    <th>受取人</th>
                    <th>金額</th>
                    <th>ステータス</th>
                    <th>Stripe ID</th>
                </tr>
            </thead>
            <tbody>
                <!-- 動的に生成 -->
            </tbody>
        </table>
    </section>
</body>
</html>
```

#### Day 13: 申請者用マイページ

**user-dashboard.html:**
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <title>マイページ - BucksBox</title>
</head>
<body>
    <!-- Stripe連携状態 -->
    <section id="stripe-status">
        <h2>報酬受取設定</h2>
        <div id="connection-status">
            <!-- 連携状態を表示 -->
        </div>
    </section>
    
    <!-- 収益サマリー -->
    <section id="revenue-summary">
        <h2>収益サマリー</h2>
        <div class="summary-cards">
            <div class="card">
                <h3>今月の収益</h3>
                <p class="amount">¥0</p>
            </div>
            <div class="card">
                <h3>累計収益</h3>
                <p class="amount">¥0</p>
            </div>
            <div class="card">
                <h3>次回支払予定</h3>
                <p class="date">--</p>
            </div>
        </div>
    </section>
    
    <!-- 支払い履歴 -->
    <section id="payment-history">
        <h2>支払い履歴</h2>
        <table>
            <thead>
                <tr>
                    <th>支払日</th>
                    <th>アプリ名</th>
                    <th>期間</th>
                    <th>金額</th>
                    <th>明細</th>
                </tr>
            </thead>
            <tbody>
                <!-- 動的に生成 -->
            </tbody>
        </table>
    </section>
</body>
</html>
```

---

### **Phase 5: テストと本番移行（2025年2月6日〜2月10日）**

#### Day 14-15: テスト実施

**テストシナリオ:**
1. **Stripe Connect連携テスト**
   - テストアカウントで連携
   - オンボーディング完了確認
   - Webhook受信確認

2. **支払いフローテスト**
   ```javascript
   // テスト用データ
   const testPayments = [
     { amount: 1000, type: 'idea', expected: 180 },
     { amount: 10000, type: 'review', expected: 5500 },
     { amount: 999, type: 'idea', expected: 0 }, // 最低金額未満
   ]
   ```

3. **エラーハンドリング**
   - Stripe API障害時
   - 無効なアカウント
   - 支払い失敗時のリトライ

#### Day 16: セキュリティ監査

**チェックリスト:**
- [ ] APIキーの環境変数化
- [ ] Webhook署名検証
- [ ] HTTPS通信の強制
- [ ] SQLインジェクション対策
- [ ] XSS対策
- [ ] CSRF対策
- [ ] レート制限実装

#### Day 17: 本番環境設定

```bash
# 本番用環境変数
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...

# Supabase本番設定
supabase functions deploy stripe-connect
supabase functions deploy calculate-revenue
supabase functions deploy process-payments
```

---

## 📊 KPI設定

### 成功指標
- **連携率:** 申請者の80%以上がStripe連携完了
- **支払い成功率:** 99%以上
- **処理時間:** 売上確定から支払いまで5営業日以内
- **サポート問い合わせ:** 支払い関連の問い合わせ月5件以下

### モニタリング項目
```javascript
// 監視ダッシュボード
const metrics = {
  daily: {
    new_connections: 0,
    payment_processed: 0,
    total_amount: 0,
    failed_payments: 0
  },
  weekly: {
    active_accounts: 0,
    revenue_share_idea: 0,
    revenue_share_review: 0
  },
  monthly: {
    total_payouts: 0,
    average_payout: 0,
    churn_rate: 0
  }
}
```

---

## 🚨 リスク管理

### 想定リスクと対策

1. **Stripe障害時**
   - 代替: PayPalバックアップ
   - 手動処理フロー準備

2. **法規制変更**
   - 資金決済法の定期確認
   - 弁護士との月次レビュー

3. **不正利用**
   - Stripe Radar導入
   - 異常検知アラート

---

## 📝 必要なドキュメント

1. **利用規約更新**
```
第X条（報酬の支払い）
1. 報酬はStripe Connect経由で支払われます
2. 本人確認が必要です
3. 最低支払い金額は1,000円です
4. 支払い手数料は申請者負担となります
```

2. **プライバシーポリシー更新**
```
収集する情報:
- Stripeが収集する本人確認情報
- 銀行口座情報（Stripeが直接保管）
```

3. **特定商取引法に基づく表記**
```
支払い方法: Stripe経由での銀行振込
支払い時期: 売上確定月の翌月末
```

---

## ✅ 実装完了チェックリスト

### 必須機能
- [ ] Stripeアカウント作成・設定
- [ ] Stripe Connect連携機能
- [ ] 収益計算ロジック
- [ ] 自動支払い処理
- [ ] 支払い履歴管理
- [ ] エラーハンドリング

### 追加機能
- [ ] 管理者ダッシュボード
- [ ] 申請者マイページ
- [ ] レポート生成
- [ ] CSV出力
- [ ] 税務帳票対応

### ドキュメント
- [ ] API仕様書
- [ ] 運用マニュアル
- [ ] トラブルシューティングガイド
- [ ] ユーザーガイド

---

## 💬 備考

- 初期は手動運用も併用し、段階的に自動化
- 2月中旬までに基本機能実装完了目標
- 3月から本格運用開始予定
- 四半期ごとに機能改善レビュー実施

---

**次回作業開始時の確認事項:**
1. このドキュメントの内容確認
2. Stripeアカウント作成状況
3. 実装優先順位の最終決定
4. スケジュール調整

このプランに基づいて、着実に実装を進めていきます。