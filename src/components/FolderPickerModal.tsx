import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getAccessToken } from '../services/googleAuth';
import { createFolder, listFolders } from '../services/storage/googleDrive';
import { ThemeColors } from '../theme/types';

interface Folder {
  id: string;
  name: string;
}

interface FolderPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (folderId: string, folderName: string) => Promise<void> | void;
}

export const FolderPickerModal: React.FC<FolderPickerModalProps> = ({
  visible,
  onClose,
  onSelect
}) => {
  const [currentPath, setCurrentPath] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'マイドライブ' }
  ]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const currentFolder = currentPath[currentPath.length - 1];

  useEffect(() => {
    if (visible) {
      const rootId = 'root';
      loadFolders(rootId);
      // 初期フォルダが指定されていれば、そこまでのパスを構築するロジックが必要だが
      // APIの制限で「親を辿る」のが難しいため、一旦ルートから開始する仕様とする
      setCurrentPath([{ id: rootId, name: 'マイドライブ' }]);
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
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
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
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={folders}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.folderItem} onPress={() => handleFolderPress(item)}>
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
                  placeholderTextColor={colors.textSecondary}
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end'
    },
    modalContent: {
      backgroundColor: colors.surface, // Changed from #1a1a2e
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: '80%',
      paddingBottom: 20
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border // Changed from #2e2e3e
    },
    headerTitle: {
      color: colors.text, // Changed from #fff
      fontSize: 18,
      fontWeight: 'bold'
    },
    closeButton: {
      padding: 8
    },
    closeButtonText: {
      color: colors.text, // Changed from #fff
      fontSize: 18
    },
    pathContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.surfaceHighlight // Changed from #232336
    },
    backButton: {
      paddingRight: 10
    },
    backButtonText: {
      color: colors.primary, // Changed from #6366f1
      fontWeight: 'bold'
    },
    pathText: {
      color: colors.textSecondary, // Changed from #e5e7eb
      fontSize: 14,
      flex: 1
    },
    list: {
      flex: 1
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    folderItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border // Changed from #2e2e3e
    },
    folderIcon: {
      fontSize: 20,
      marginRight: 12,
      color: colors.text // Added base color
    },
    folderName: {
      color: colors.text, // Changed from #fff
      fontSize: 16,
      flex: 1
    },
    arrowIcon: {
      color: colors.textTertiary, // Changed from #6b7280
      fontSize: 20
    },
    emptyContainer: {
      padding: 32,
      alignItems: 'center'
    },
    emptyText: {
      color: colors.textTertiary // Changed from #6b7280
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border // Changed from #2e2e3e
    },
    footerActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12
    },
    createFolderContainer: {
      gap: 12
    },
    createFolderActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12
    },
    input: {
      backgroundColor: colors.surfaceVariant, // Changed from #1e1e2e
      borderRadius: 8,
      padding: 12,
      color: colors.text, // Changed from #ffffff
      borderWidth: 1,
      borderColor: colors.border // Changed from #2e2e3e
    },
    button: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center'
    },
    newFolderButton: {
      backgroundColor: colors.surfaceVariant // Changed from #374151
    },
    selectButton: {
      backgroundColor: colors.primary // Changed from #6366f1
    },
    createButton: {
      backgroundColor: '#10b981' // Kept fixed green for create action
    },
    cancelButton: {
      backgroundColor: colors.error // Changed from #ef4444
    },
    buttonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14
    }
  });
