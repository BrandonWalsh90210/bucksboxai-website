// ============================================
// BucksBox.ai iOS審査代行 - モード設定
// ============================================
// 作成日: 2025年1月20日
// 最終更新: 2025年10月20日
// ============================================

// ============================================
// 🔴 モード切り替えは以下の1行のみ変更してください
// ============================================
const APP_MODE = 'FREE';  // 'FREE' または 'PAID'
// ============================================

// ============================================
// 以下は自動設定（変更不要）
// ============================================
const STRIPE_CONFIG = {
    // モードに応じた自動設定
    REVIEW_FEE: APP_MODE === 'FREE' ? 0 : 500,
    ENABLE_PAYMENT: APP_MODE === 'PAID',

    // Stripe設定（固定）
    PUBLISHABLE_KEY: 'pk_test_51S7axVHmf6CsUBPoziQSFezCwa7trGNqxA35p4Zc958NV6HdnSg48LTsowgPdtqeAVbEgX5H5IlvKIdXtsr52Ibc00gpMG6Pve',
    MODE: 'test', // 'test' or 'live'
    CURRENCY: 'jpy',
    SERVICE_NAME: 'iOS審査代行手数料'
};

// ============================================
// 検証・デバッグ
// ============================================

// モード検証
if (APP_MODE !== 'FREE' && APP_MODE !== 'PAID') {
    console.error('❌ ERROR: APP_MODE must be "FREE" or "PAID"');
    console.error('Current value:', APP_MODE);
    throw new Error('Invalid APP_MODE configuration');
}

// 設定値の検証
if (typeof STRIPE_CONFIG.REVIEW_FEE !== 'number' || STRIPE_CONFIG.REVIEW_FEE < 0) {
    console.error('❌ ERROR: STRIPE_CONFIG.REVIEW_FEE must be a non-negative number');
    throw new Error('Invalid REVIEW_FEE configuration');
}

// デバッグ情報（開発時のみ）
if (STRIPE_CONFIG.MODE === 'test') {
    console.log('========================================');
    console.log('📱 BucksBox.ai iOS審査代行');
    console.log('========================================');
    console.log('✅ Current Mode:', APP_MODE);
    console.log('💰 Review Fee:', STRIPE_CONFIG.REVIEW_FEE + '円');
    console.log('💳 Payment:', STRIPE_CONFIG.ENABLE_PAYMENT ? '有効 (Stripe連携)' : '無効 (無料)');
    console.log('🔧 Stripe Mode:', STRIPE_CONFIG.MODE);
    console.log('========================================');

    // 使用テーブルの案内
    if (APP_MODE === 'FREE') {
        console.log('📊 Target Table: contact_submissions');
        console.log('📧 Make Scenario: iOS Review Decision (Free Mode)');
    } else {
        console.log('📊 Target Table: review_applications');
        console.log('📧 Make Scenario: iOS Review Decision (Paid Mode)');
    }
    console.log('========================================');
}
