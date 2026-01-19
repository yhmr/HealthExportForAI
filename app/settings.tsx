// 設定画面（認証統合版）

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';
import {
    saveDriveConfig,
    loadExportFormats,
    saveExportFormats,
    loadExportSheetAsPdf,
    saveExportSheetAsPdf,
} from '../src/services/preferences';
import type { DriveConfig, ExportFormat } from '../src/config/driveConfig';

import { getFolder, DEFAULT_FOLDER_NAME } from '../src/services/storage/googleDrive';
import { getAccessToken } from '../src/services/googleAuth';
import { FolderPickerModal } from '../src/components/FolderPickerModal';
import { ExportFormatCheckbox } from '../src/components/ExportFormatCheckbox';
import { LicenseModal } from '../src/components/LicenseModal';


export default function SettingsScreen() {
    const router = useRouter();
    const {
        driveConfig,
        loadConfig,
        saveConfig,
        isAuthenticated,
        currentUser,
        authError,
        signIn,
        signOut,
    } = useGoogleDrive();

    const [folderId, setFolderId] = useState('');
    const [folderName, setFolderName] = useState('');
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [isLicenseModalVisible, setLicenseModalVisible] = useState(false);
    const [exportFormats, setExportFormats] = useState<ExportFormat[]>(['googleSheets']);
    const [exportSheetAsPdf, setExportSheetAsPdf] = useState(false);

    // 設定を読み込み
    useEffect(() => {
        const load = async () => {
            try {
                const config = await loadConfig();
                const formats = await loadExportFormats();
                const pdfOption = await loadExportSheetAsPdf();
                setExportFormats(formats);
                setExportSheetAsPdf(pdfOption);

                // フォルダIDとフォルダ名を設定
                // 注意: フォルダIDが空の場合はエクスポート時にデフォルトフォルダが自動作成される
                const currentFolderId = config?.folderId || '';
                const currentFolderName = config?.folderName || '';

                setFolderId(currentFolderId);

                if (currentFolderId && currentFolderName) {
                    // IDと名前が両方ある = そのまま表示
                    setFolderName(currentFolderName);
                } else if (currentFolderId) {
                    // IDはあるが名前がない = APIから取得を試みる
                    const token = await getAccessToken();
                    if (token) {
                        const folder = await getFolder(currentFolderId, token);
                        if (folder) {
                            setFolderName(folder.name);
                            // 設定を更新して保存
                            await saveDriveConfig({ folderId: currentFolderId, folderName: folder.name });
                        } else {
                            // フォルダが見つからない = 削除された可能性があるのでリセット
                            setFolderName(DEFAULT_FOLDER_NAME);
                            setFolderId('');
                            await saveDriveConfig({ folderId: '', folderName: '' });
                        }
                    } else {
                        // 認証されていない = デフォルト名を暫定表示
                        setFolderName(DEFAULT_FOLDER_NAME);
                    }
                } else {
                    // IDがない = デフォルトフォルダが使われる
                    setFolderName(DEFAULT_FOLDER_NAME);
                }
            } catch (error) {
                console.error('[Settings] Load config error:', error);
                setFolderName(DEFAULT_FOLDER_NAME);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadConfig]);

    // 認証エラー表示
    useEffect(() => {
        if (authError) {
            Alert.alert('認証エラー', authError);
        }
    }, [authError]);


    // サインインハンドラ
    const handleSignIn = async () => {
        await signIn();
    };

    // エクスポート形式のトグル
    const toggleExportFormat = async (format: ExportFormat) => {
        const newFormats = exportFormats.includes(format)
            ? exportFormats.filter(f => f !== format)
            : [...exportFormats, format];
        setExportFormats(newFormats);
        await saveExportFormats(newFormats);
    };

    // 戻るボタン押下時のバリデーション
    const handleBack = () => {
        if (exportFormats.length === 0) {
            Alert.alert(
                '警告',
                'エクスポート形式が選択されていません。少なくとも1つの形式を選択してください。',
                [
                    { text: 'キャンセル', style: 'cancel' },
                    { text: 'このまま戻る', onPress: () => router.back() }
                ]
            );
            return;
        }
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* ヘッダー */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack}>
                    <Text style={styles.backButton}>← 戻る</Text>
                </TouchableOpacity>
                <Text style={styles.title}>設定</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Google認証 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Googleアカウント</Text>

                    {isAuthenticated && currentUser ? (
                        <View style={styles.authInfo}>
                            <Text style={styles.authEmail}>
                                ✅ {currentUser.user.email}
                            </Text>
                            <TouchableOpacity
                                style={styles.signOutButton}
                                onPress={signOut}
                            >
                                <Text style={styles.signOutText}>サインアウト</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.signInButton}
                            onPress={handleSignIn}
                        >
                            <Text style={styles.signInText}>🔐 Googleでサインイン</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Google Drive設定 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Google Drive</Text>

                    <Text style={styles.label}>保存先フォルダ</Text>
                    <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={folderName}
                        editable={false}
                        placeholder={DEFAULT_FOLDER_NAME}
                        placeholderTextColor="#666"
                    />

                    <TouchableOpacity
                        style={styles.selectButton}
                        onPress={() => setPickerVisible(true)}
                    >
                        <Text style={styles.selectButtonText}>📂 保存先を変更</Text>
                    </TouchableOpacity>
                </View>



                {/* Modals */}
                <FolderPickerModal
                    visible={isPickerVisible}
                    onClose={() => setPickerVisible(false)}
                    initialFolderId={folderId}
                    initialFolderName={folderName}
                    onSelect={async (id, name) => {
                        setFolderId(id);
                        setFolderName(name);
                        setPickerVisible(false);
                        // 選択時に自動保存
                        await saveDriveConfig({ folderId: id, folderName: name });
                    }}
                />
                <LicenseModal
                    visible={isLicenseModalVisible}
                    onClose={() => setLicenseModalVisible(false)}
                />


                {/* エクスポート形式 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>エクスポート形式</Text>
                    <Text style={styles.hint}>複数の形式を選択できます</Text>

                    <ExportFormatCheckbox
                        label="Google Sheets"
                        description="Googleスプレッドシートに出力"
                        checked={exportFormats.includes('googleSheets')}
                        onToggle={() => toggleExportFormat('googleSheets')}
                    />
                    {/* PDFはSheetsのサブオプション */}
                    {exportFormats.includes('googleSheets') && (
                        <View style={styles.subOption}>
                            <ExportFormatCheckbox
                                label="PDF"
                                description="SheetsをPDFとしてもエクスポート"
                                checked={exportSheetAsPdf}
                                onToggle={async () => {
                                    const newValue = !exportSheetAsPdf;
                                    setExportSheetAsPdf(newValue);
                                    await saveExportSheetAsPdf(newValue);
                                }}
                            />
                        </View>
                    )}
                    <ExportFormatCheckbox
                        label="CSV"
                        description="カンマ区切りファイル（他ツール連携）"
                        checked={exportFormats.includes('csv')}
                        onToggle={() => toggleExportFormat('csv')}
                    />
                    <ExportFormatCheckbox
                        label="JSON"
                        description="構造化データ（AI連携向け）"
                        checked={exportFormats.includes('json')}
                        onToggle={() => toggleExportFormat('json')}
                    />
                </View>

                {/* アプリ情報 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>アプリ情報</Text>
                    <TouchableOpacity
                        style={styles.selectButton}
                        onPress={() => setLicenseModalVisible(true)}
                    >
                        <Text style={styles.selectButtonText}>📜 サードパーティライセンス</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#1a1a2e',
    },
    backButton: {
        color: '#6366f1',
        fontSize: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    placeholder: {
        width: 50,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 12,
    },
    subHint: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: '#a0a0b0',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1e1e2e',
        borderRadius: 8,
        padding: 12,
        color: '#ffffff',
        fontSize: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#2e2e3e',
    },
    hint: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
        marginBottom: 8,
    },
    authInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e1e2e',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    authEmail: {
        color: '#10b981',
        fontSize: 14,
        flex: 1,
    },
    signInButton: {
        backgroundColor: '#4285f4',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    signInText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    signOutButton: {
        backgroundColor: '#ef4444',
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    signOutText: {
        color: '#ffffff',
        fontSize: 12,
    },
    saveButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 32,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    readOnlyInput: {
        backgroundColor: '#161622',
        color: '#9ca3af',
    },
    selectButton: {
        backgroundColor: '#4b5563',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginBottom: 8,
    },
    selectButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    subOption: {
        paddingLeft: 24,
        borderLeftWidth: 2,
        borderLeftColor: '#6366f1',
        marginLeft: 8,
        marginTop: 4,
    },
});
