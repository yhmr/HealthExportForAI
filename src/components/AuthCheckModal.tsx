// 認証チェックモーダル
// 未認証時にユーザーにサインインを促すモーダル

import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthCheckModalProps {
    /** モーダルの表示状態 */
    visible: boolean;
    /** サインイン処理中かどうか */
    isSigningIn: boolean;
    /** モーダルを閉じる（スキップ） */
    onSkip: () => void;
    /** サインインを実行 */
    onSignIn: () => void;
}

/**
 * 認証チェックモーダル
 * アプリ起動時にGoogleアカウントが未連携の場合に表示
 */
export function AuthCheckModal({
    visible,
    isSigningIn,
    onSkip,
    onSignIn,
}: AuthCheckModalProps) {
    const { t } = useLanguage();

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* アイコン */}
                    <Text style={styles.icon}>🔗</Text>

                    {/* タイトル */}
                    <Text style={styles.title}>{t('authModal', 'title')}</Text>

                    {/* 説明 */}
                    <Text style={styles.description}>
                        {t('authModal', 'description')}
                    </Text>

                    {/* サインインボタン */}
                    <TouchableOpacity
                        style={[
                            styles.signInButton,
                            isSigningIn && styles.signInButtonDisabled,
                        ]}
                        onPress={onSignIn}
                        disabled={isSigningIn}
                    >
                        {isSigningIn ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.signInButtonText}>
                                🔐 {t('authModal', 'signIn')}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* スキップボタン */}
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={onSkip}
                        disabled={isSigningIn}
                    >
                        <Text style={styles.skipButtonText}>{t('authModal', 'skip')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    signInButton: {
        backgroundColor: '#4285f4',
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
    },
    signInButtonDisabled: {
        opacity: 0.7,
    },
    signInButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    skipButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    skipButtonText: {
        color: '#6b7280',
        fontSize: 14,
    },
});
