import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// New Components
import { AuthStep } from '../src/components/Onboarding/AuthStep';
import { CompletedStep } from '../src/components/Onboarding/CompletedStep';
import { ExportFormatStep } from '../src/components/Onboarding/ExportFormatStep';
import { ExportStep } from '../src/components/Onboarding/ExportStep';
import { FolderStep } from '../src/components/Onboarding/FolderStep';
import { PermissionsStep } from '../src/components/Onboarding/PermissionsStep';
import { SetupStep } from '../src/components/Onboarding/SetupStep';
import { WelcomeStep } from '../src/components/Onboarding/WelcomeStep';

// Config & Services
import { DEFAULT_EXPORT_FORMATS, ExportFormat } from '../src/config/driveConfig';
import { useAuth } from '../src/contexts/AuthContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';
import { useHealthConnect } from '../src/hooks/useHealthConnect';
import { exportConfigService } from '../src/services/config/ExportConfigService';
import { DEFAULT_FOLDER_NAME } from '../src/services/storage/googleDrive';
import { useHealthStore } from '../src/stores/healthStore';
import { ALL_DATA_TAGS, DataTagKey } from '../src/types/health';

// ステップ定義
const STEPS = {
  WELCOME: 0,
  AUTH: 1,
  PERMISSIONS: 2,
  SETUP: 3,
  FORMAT: 4,
  FOLDER: 5,
  EXPORT: 6,
  COMPLETED: 7
} as const;

type Step = (typeof STEPS)[keyof typeof STEPS];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<Step>(STEPS.WELCOME);

  // Auth state
  const { isAuthenticated, currentUser, signIn } = useAuth();
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);

  // Health Connect state
  const {
    hasPermissions,
    requestPermissions,
    fetchHealthData,
    isLoading: isSyncing,
    openHealthConnectSettings,
    initialize: checkHcPermissions
  } = useHealthConnect();
  const { healthData } = useHealthStore();
  const [hasAttemptedPermissions, setHasAttemptedPermissions] = useState(false);

  // フォアグラウンド復帰時に権限状態を再チェック
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && currentStep === STEPS.PERMISSIONS) {
        const hasPerms = await checkHcPermissions();
        if (hasPerms) {
          // 権限が付与されていたら自動的に次へ (重複防止のため現在のステップを確認)
          setCurrentStep((prev) => (prev === STEPS.PERMISSIONS ? STEPS.SETUP : prev));
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [currentStep, checkHcPermissions]);

  // Drive state
  const {
    loadConfig,
    saveConfig,
    driveConfig,
    exportAndUpload,
    isUploading,
    uploadError,
    clearUploadError
  } = useGoogleDrive();
  const [folderName, setFolderName] = useState<string>(DEFAULT_FOLDER_NAME);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  // 初期設定State
  const [initialDays, setInitialDays] = useState(30);
  const [selectedTags, setSelectedTags] = useState<Set<DataTagKey>>(new Set(ALL_DATA_TAGS));
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>(DEFAULT_EXPORT_FORMATS);
  const [exportSheetAsPdf, setExportSheetAsPdf] = useState(false);
  const [hasFetched, setHasFetched] = useState(false); // データ取得済みフラグ

  // 初期設定読み込み
  useEffect(() => {
    loadConfig();
    // 既存のエクスポート設定も読み込む場合はここに追加
  }, [loadConfig]);

  // configからフォルダ名反映
  useEffect(() => {
    if (driveConfig?.folderName) {
      setFolderName(driveConfig.folderName);
    }
  }, [driveConfig]);

  // EXPORTステップに入ったら自動実行
  useEffect(() => {
    if (currentStep === STEPS.EXPORT && !isUploading && !uploadError) {
      handleExport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // エクスポート実行
  const handleExport = async () => {
    // 選択されたタグでエクスポート
    const result = await exportAndUpload();
    if (result.success) {
      setCurrentStep(STEPS.COMPLETED);
    }
    // 失敗時はエラー表示（exportAndUpload内でセットされるuploadErrorを表示）
  };

  // ハンドラ: 次へ
  const handleNext = async () => {
    if (currentStep === STEPS.SETUP) {
      // 設定保存
      await exportConfigService.saveExportPeriodDays(initialDays);
      await exportConfigService.saveSelectedDataTags(Array.from(selectedTags));
    }

    if (currentStep === STEPS.FORMAT) {
      await exportConfigService.saveExportFormats(exportFormats);
      await exportConfigService.saveExportSheetAsPdf(exportSheetAsPdf);
    }

    if (currentStep < STEPS.COMPLETED) {
      setCurrentStep((prev) => (prev + 1) as Step);
    } else {
      await exportConfigService.saveIsSetupCompleted(true);
      router.replace('/');
    }
  };

  // ハンドラ: サインイン
  const handleSignIn = async () => {
    try {
      const success = await signIn();
      if (success) {
        if (currentStep < STEPS.COMPLETED) setCurrentStep((prev) => (prev + 1) as Step);
      }
    } catch {
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
        // 重複防止のため現在のステップを確認して次へ
        setCurrentStep((prev) => (prev === STEPS.PERMISSIONS ? STEPS.SETUP : prev));
      }
    } catch {
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

  // タグ切り替え
  const toggleTag = (tag: DataTagKey) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(tag)) {
      newSet.delete(tag);
    } else {
      newSet.add(tag);
    }
    setSelectedTags(newSet);
  };

  // データ取得ハンドラ
  const handleFetch = async () => {
    const success = await fetchHealthData(initialDays);
    if (success) {
      setHasFetched(true);
    }
  };

  // フォーマット切り替え
  const toggleFormat = (format: ExportFormat) => {
    if (exportFormats.includes(format)) {
      setExportFormats(exportFormats.filter((f) => f !== format));
    } else {
      setExportFormats([...exportFormats, format]);
    }
  };

  // レンダリング用ヘルパー
  const renderStepContent = () => {
    switch (currentStep) {
      case STEPS.WELCOME:
        return <WelcomeStep onNext={handleNext} />;

      case STEPS.AUTH:
        return (
          <AuthStep
            isAuthenticated={isAuthenticated}
            currentUser={currentUser}
            hasAttemptedAuth={hasAttemptedAuth}
            onSignIn={handleSignIn}
            onNext={handleNext}
          />
        );

      case STEPS.PERMISSIONS:
        return (
          <PermissionsStep
            hasPermissions={hasPermissions}
            hasAttemptedPermissions={hasAttemptedPermissions}
            onRequestPermissions={handleRequestPermissions}
            onOpenSettings={openHealthConnectSettings}
            onNext={handleNext}
          />
        );

      case STEPS.SETUP:
        return (
          <SetupStep
            initialDays={initialDays}
            setInitialDays={(days) => {
              setInitialDays(days);
              setHasFetched(false);
            }}
            isSyncing={isSyncing}
            onFetch={handleFetch}
            hasFetched={hasFetched}
            healthData={healthData}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            onNext={handleNext}
          />
        );

      case STEPS.FORMAT:
        return (
          <ExportFormatStep
            exportFormats={exportFormats}
            toggleFormat={toggleFormat}
            exportSheetAsPdf={exportSheetAsPdf}
            setExportSheetAsPdf={setExportSheetAsPdf}
            onNext={handleNext}
          />
        );

      case STEPS.FOLDER:
        return (
          <FolderStep
            folderName={folderName}
            showFolderPicker={showFolderPicker}
            setShowFolderPicker={setShowFolderPicker}
            onFolderSelect={handleFolderSelect}
            onNext={handleNext}
          />
        );

      case STEPS.EXPORT:
        return (
          <ExportStep
            isUploading={isUploading}
            uploadError={uploadError}
            onRetry={() => {
              clearUploadError();
              handleExport();
            }}
          />
        );

      case STEPS.COMPLETED:
        return <CompletedStep onNext={handleNext} />;
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
  }
});
