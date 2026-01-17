import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import { listFolders, createFolder } from '../services/googleDrive';
import { getAccessToken } from '../services/googleAuth';

interface Folder {
    id: string;
    name: string;
}

interface FolderPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (folderId: string, folderName: string) => void;
    initialFolderId?: string;
    initialFolderName?: string;
}

export const FolderPickerModal: React.FC<FolderPickerModalProps> = ({
    visible,
    onClose,
    onSelect,
    initialFolderId,
    initialFolderName,
}) => {
    const [currentPath, setCurrentPath] = useState<{ id: string; name: string }[]>([
        { id: 'root', name: 'マイドライブ' },
    ]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    const currentFolder = currentPath[currentPath.length - 1];

    useEffect(() => {
        if (visible) {
            loadFolders(currentFolder.id);
            // 初期フォルダが指定されていれば、そこまでのパスを構築するロジックが必要だが
            // APIの制限で「親を辿る」のが難しいため、一旦ルートから開始する仕様とする
            setCurrentPath([{ id: 'root', name: 'マイドライブ' }]);
        }
    }, [visible]);

    const loadFolders = async (parentId: string) => {
        setIsLoading(true);
        try {
            const token = await getAccessToken();
            if (token) {
                const list = await listFolders(token, parentId);
                setFolders(list);
            }
        } catch (error) {
            console.error('Failed to load folders:', error);
            Alert.alert('エラー', 'フォルダ一覧の取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFolderPress = (folder: Folder) => {
        const newPath = [...currentPath, folder];
        setCurrentPath(newPath);
        loadFolders(folder.id);
    };

    const handleBackPress = () => {
        if (currentPath.length > 1) {
            const newPath = currentPath.slice(0, -1);
            setCurrentPath(newPath);
            loadFolders(newPath[newPath.length - 1].id);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        setIsLoading(true);
        try {
            const token = await getAccessToken();
            if (token) {
                const newId = await createFolder(newFolderName, token, currentFolder.id);
                if (newId) {
                    setNewFolderName('');
                    setIsCreatingFolder(false);
                    loadFolders(currentFolder.id);
                    Alert.alert('成功', 'フォルダを作成しました');
                } else {
                    Alert.alert('エラー', 'フォルダの作成に失敗しました');
                }
            }
        } catch (error) {
            console.error('Failed to create folder:', error);
            Alert.alert('エラー', 'フォルダの作成に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* ヘッダー */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>保存先を選択</Text>
                        <View style={{ width: 30 }} />
                    </View>

                    {/* 現在のパス */}
                    <View style={styles.pathContainer}>
                        {currentPath.length > 1 && (
                            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                                <Text style={styles.backButtonText}>← 戻る</Text>
                            </TouchableOpacity>
                        )}
                        <Text style={styles.pathText} numberOfLines={1}>
                            📂 {currentFolder.name}
                        </Text>
                    </View>

                    {/* フォルダ一覧 */}
                    {isLoading && !folders.length ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#6366f1" />
                        </View>
                    ) : (
                        <FlatList
                            data={folders}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.folderItem}
                                    onPress={() => handleFolderPress(item)}
                                >
                                    <Text style={styles.folderIcon}>📁</Text>
                                    <Text style={styles.folderName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.arrowIcon}>›</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>フォルダがありません</Text>
                                </View>
                            )}
                            style={styles.list}
                        />
                    )}

                    {/* アクションエリア */}
                    <View style={styles.footer}>
                        {isCreatingFolder ? (
                            <View style={styles.createFolderContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={newFolderName}
                                    onChangeText={setNewFolderName}
                                    placeholder="新しいフォルダ名"
                                    placeholderTextColor="#9ca3af"
                                    autoFocus
                                />
                                <View style={styles.createFolderActions}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.cancelButton]}
                                        onPress={() => setIsCreatingFolder(false)}
                                    >
                                        <Text style={styles.buttonText}>キャンセル</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.createButton]}
                                        onPress={handleCreateFolder}
                                    >
                                        <Text style={styles.buttonText}>作成</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.footerActions}>
                                <TouchableOpacity
                                    style={[styles.button, styles.newFolderButton]}
                                    onPress={() => setIsCreatingFolder(true)}
                                >
                                    <Text style={styles.buttonText}>+ 新規フォルダ</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.selectButton]}
                                    onPress={() => onSelect(currentFolder.id, currentFolder.name)}
                                >
                                    <Text style={styles.buttonText}>ここに保存</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1a1a2e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2e2e3e',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 18,
    },
    pathContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#232336',
    },
    backButton: {
        paddingRight: 10,
    },
    backButtonText: {
        color: '#6366f1',
        fontWeight: 'bold',
    },
    pathText: {
        color: '#e5e7eb',
        fontSize: 14,
        flex: 1,
    },
    list: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2e2e3e',
    },
    folderIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    folderName: {
        color: '#fff',
        fontSize: 16,
        flex: 1,
    },
    arrowIcon: {
        color: '#6b7280',
        fontSize: 20,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: '#6b7280',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#2e2e3e',
    },
    footerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    createFolderContainer: {
        gap: 12,
    },
    createFolderActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    input: {
        backgroundColor: '#1e1e2e',
        borderRadius: 8,
        padding: 12,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#2e2e3e',
    },
    button: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    newFolderButton: {
        backgroundColor: '#374151',
    },
    selectButton: {
        backgroundColor: '#6366f1',
    },
    createButton: {
        backgroundColor: '#10b981',
    },
    cancelButton: {
        backgroundColor: '#ef4444',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
