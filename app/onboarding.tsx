import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FolderPickerModal } from '../src/components/FolderPickerModal';
import { SyncButton } from '../src/components/SyncButton';
import { useAuth } from '../src/contexts/AuthContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';
import { useHealthConnect } from '../src/hooks/useHealthConnect';
import { DEFAULT_FOLDER_NAME } from '../src/services/storage/googleDrive';

// ステップ定義
const STEPS = {
  WELCOME: 0,
  AUTH: 1,
  PERMISSIONS: 2,
  FOLDER: 3,
  COMPLETED: 4
} as const;

type Step = (typeof STEPS)[keyof typeof STEPS];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<Step>(STEPS.WELCOME);

  // Auth state
  const { isAuthenticated, currentUser, signIn } = useAuth();

  // Health Connect state
  const { hasPermissions, requestPermissions } = useHealthConnect();

  // Drive state
  const { loadConfig, saveConfig, driveConfig } = useGoogleDrive();
  const [folderName, setFolderName] = useState<string>(DEFAULT_FOLDER_NAME);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  // 試行状態管理
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);
  const [hasAttemptedPermissions, setHasAttemptedPermissions] = useState(false);

  // 初期設定読み込み
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // configからフォルダ名反映
  useEffect(() => {
    if (driveConfig?.folderName) {
      setFolderName(driveConfig.folderName);
    }
  }, [driveConfig]);

  // ハンドラ: 次へ
  const handleNext = () => {
    if (currentStep < STEPS.COMPLETED) {
      setCurrentStep((prev) => (prev + 1) as Step);
    } else {
      router.replace('/');
    }
  };

  // ハンドラ: サインイン
  const handleSignIn = async () => {
    try {
      const success = await signIn();
      if (success) {
        handleNext(); // 自動で次へ
      }
    } catch (error) {
      Alert.alert(t('common', 'error'), 'Sign in failed');
    } finally {
      setHasAttemptedAuth(true);
    }
  };

  // ハンドラ: 権限リクエスト
  const handleRequestPermissions = async () => {
    try {
      const granted = await requestPermissions();
      if (granted) {
        handleNext(); // 自動で次へ
      }
    } catch (error) {
      Alert.alert(t('common', 'error'), 'Permission request failed');
    } finally {
      setHasAttemptedPermissions(true);
    }
  };

  // ハンドラ: フォルダ選択完了
  const handleFolderSelect = async (folderId: string, name: string) => {
    setFolderName(name);
    setShowFolderPicker(false);

    // 設定を保存
    await saveConfig({ folderId, folderName: name });
  };

  // レンダリング用ヘルパー
  const renderStepContent = () => {
    switch (currentStep) {
      case STEPS.WELCOME:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.icon}>👋</Text>
            <Text style={styles.title}>{t('onboarding', 'welcomeTitle')}</Text>
            <Text style={styles.description}>{t('onboarding', 'welcomeDesc')}</Text>
            <SyncButton
              onPress={handleNext}
              isLoading={false}
              label={t('onboarding', 'getStarted')}
              icon="➡️"
              variant="primary"
            />
          </View>
        );

      case STEPS.AUTH:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.icon}>🔐</Text>
            <Text style={styles.title}>{t('onboarding', 'signInTitle')}</Text>
            <Text style={styles.description}>{t('onboarding', 'signInDesc')}</Text>
            {isAuthenticated ? (
              <View style={styles.completedState}>
                <Text style={styles.successText}>
                  {t('onboarding', 'signedInAs').replace(
                    '{{email}}',
                    currentUser?.user.email || ''
                  )}
                </Text>
                <SyncButton
                  onPress={handleNext}
                  isLoading={false}
                  label={t('onboarding', 'next')}
                  icon="check"
                  variant="primary"
                />
              </View>
            ) : (
              <View style={styles.actionContainer}>
                {hasAttemptedAuth && (
                  <Text style={styles.warningText}>{t('onboarding', 'authRequired')}</Text>
                )}

                <SyncButton
                  onPress={handleSignIn}
                  isLoading={false}
                  label={t('onboarding', 'signInButton')}
                  icon="🇬"
                  variant="primary"
                />

                {hasAttemptedAuth && (
                  <SyncButton
                    onPress={() => BackHandler.exitApp()}
                    isLoading={false}
                    label={t('onboarding', 'exitApp')}
                    icon="✕"
                    variant="secondary"
                  />
                )}
              </View>
            )}
          </View>
        );

      case STEPS.PERMISSIONS:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.icon}>❤️</Text>
            <Text style={styles.title}>{t('onboarding', 'healthTitle')}</Text>
            <Text style={styles.description}>{t('onboarding', 'healthDesc')}</Text>
            {hasPermissions ? (
              <View style={styles.completedState}>
                <Text style={styles.successText}>{t('onboarding', 'permissionsGranted')}</Text>
                <SyncButton
                  onPress={handleNext}
                  isLoading={false}
                  label={t('onboarding', 'next')}
                  icon="✅"
                  variant="primary"
                />
              </View>
            ) : (
              <View style={styles.actionContainer}>
                {hasAttemptedPermissions && (
                  <Text style={styles.warningText}>{t('onboarding', 'permissionRequired')}</Text>
                )}

                <SyncButton
                  onPress={handleRequestPermissions}
                  isLoading={false}
                  label={t('onboarding', 'grantPermissions')}
                  icon="🛡️"
                  variant="primary"
                />

                {hasAttemptedPermissions && (
                  <SyncButton
                    onPress={() => BackHandler.exitApp()}
                    isLoading={false}
                    label={t('onboarding', 'exitApp')}
                    icon="✕"
                    variant="secondary"
                  />
                )}
              </View>
            )}
          </View>
        );

      case STEPS.FOLDER:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.icon}>📁</Text>
            <Text style={styles.title}>{t('onboarding', 'folderTitle')}</Text>
            <Text style={styles.description}>{t('onboarding', 'folderDesc')}</Text>

            <View style={styles.folderSelection}>
              <Text style={styles.folderLabel}>{t('onboarding', 'currentFolder')}</Text>
              <Text style={styles.folderName}>{folderName}</Text>
            </View>

            <SyncButton
              onPress={() => setShowFolderPicker(true)}
              isLoading={false}
              label={t('onboarding', 'changeFolder')}
              icon="✏️"
              variant="secondary"
            />

            <View style={styles.spacer} />

            <SyncButton
              onPress={handleNext}
              isLoading={false}
              label={t('onboarding', 'next')}
              icon="➡️"
              variant="primary"
            />

            <FolderPickerModal
              visible={showFolderPicker}
              initialFolderName={folderName}
              onClose={() => setShowFolderPicker(false)}
              onSelect={handleFolderSelect}
            />
          </View>
        );

      case STEPS.COMPLETED:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.icon}>🎉</Text>
            <Text style={styles.title}>{t('onboarding', 'completedTitle')}</Text>
            <Text style={styles.description}>{t('onboarding', 'completedDesc')}</Text>
            <SyncButton
              onPress={handleNext}
              isLoading={false}
              label={t('onboarding', 'goToDashboard')}
              icon="🚀"
              variant="primary"
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {Object.values(STEPS).map((step) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              currentStep === step && styles.progressDotActive,
              currentStep > step && styles.progressDotCompleted
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>{renderStepContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a'
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 20,
    gap: 8
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2e2e3e'
  },
  progressDotActive: {
    backgroundColor: '#6366f1',
    width: 24
  },
  progressDotCompleted: {
    backgroundColor: '#10b981'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  stepContainer: {
    alignItems: 'center',
    gap: 24
  },
  icon: {
    fontSize: 64,
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center'
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300
  },
  completedState: {
    alignItems: 'center',
    gap: 16,
    width: '100%'
  },
  successText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '500'
  },
  folderSelection: {
    backgroundColor: '#1e1e2e',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    gap: 8
  },
  folderLabel: {
    color: '#6b7280',
    fontSize: 14
  },
  folderName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600'
  },
  spacer: {
    height: 24
  },
  actionContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center'
  },
  warningText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    maxWidth: 280,
    lineHeight: 20
  }
});
