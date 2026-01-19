// 期間選択コンポーネント

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
} from 'react-native';

// プリセット選択肢
const PERIOD_PRESETS = [
    { label: '1日間', value: 1 },
    { label: '3日間', value: 3 },
    { label: '7日間', value: 7 },
    { label: '30日間', value: 30 },
    { label: '90日間', value: 90 },
    { label: '180日間', value: 180 },
    { label: '1年間', value: 365 },
    { label: 'カスタム', value: -1 },
] as const;

// デフォルト値と最大値
export const DEFAULT_PERIOD_DAYS = 30;
export const MAX_PERIOD_DAYS = 365 * 3; // 3年

interface PeriodPickerProps {
    value: number;
    onChange: (days: number) => void;
}

/**
 * 期間選択ドロップダウン
 * プリセット選択 + カスタム入力
 */
export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCustom, setIsCustom] = useState(false);
    const [customValue, setCustomValue] = useState('');

    // 現在の値がプリセットにあるかチェック
    useEffect(() => {
        const isPreset = PERIOD_PRESETS.some(
            (p) => p.value === value && p.value !== -1
        );
        setIsCustom(!isPreset);
        if (!isPreset) {
            setCustomValue(value.toString());
        }
    }, [value]);

    // プリセット選択時
    const handlePresetSelect = (presetValue: number) => {
        if (presetValue === -1) {
            // カスタム選択
            setIsCustom(true);
            setCustomValue(value.toString());
        } else {
            setIsCustom(false);
            onChange(presetValue);
        }
        setIsOpen(false);
    };

    // カスタム値変更時
    const handleCustomChange = (text: string) => {
        setCustomValue(text);
        const days = parseInt(text, 10);
        if (!isNaN(days) && days > 0) {
            // 最大値を制限
            const clampedDays = Math.min(days, MAX_PERIOD_DAYS);
            onChange(clampedDays);
        }
    };

    // 表示ラベルを取得
    const getCurrentLabel = (): string => {
        if (isCustom) {
            return `${value}日間`;
        }
        const preset = PERIOD_PRESETS.find((p) => p.value === value);
        return preset?.label || `${value}日間`;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>取得期間</Text>

            <View style={styles.row}>
                {/* ドロップダウンボタン */}
                <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setIsOpen(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.dropdownText}>{getCurrentLabel()}</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {/* カスタム入力フィールド */}
                {isCustom && (
                    <View style={styles.customInputContainer}>
                        <TextInput
                            style={styles.customInput}
                            value={customValue}
                            onChangeText={handleCustomChange}
                            keyboardType="number-pad"
                            placeholder="日数"
                            placeholderTextColor="#666"
                            maxLength={4}
                        />
                        <Text style={styles.customInputSuffix}>日</Text>
                    </View>
                )}
            </View>

            {/* ドロップダウンモーダル */}
            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>取得期間を選択</Text>
                        {PERIOD_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset.value}
                                style={[
                                    styles.modalOption,
                                    value === preset.value &&
                                    !isCustom &&
                                    styles.modalOptionSelected,
                                    preset.value === -1 &&
                                    isCustom &&
                                    styles.modalOptionSelected,
                                ]}
                                onPress={() => handlePresetSelect(preset.value)}
                            >
                                <Text
                                    style={[
                                        styles.modalOptionText,
                                        (value === preset.value && !isCustom) ||
                                            (preset.value === -1 && isCustom)
                                            ? styles.modalOptionTextSelected
                                            : null,
                                    ]}
                                >
                                    {preset.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    label: {
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1f2937',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#374151',
    },
    dropdownText: {
        color: '#e5e7eb',
        fontSize: 14,
        marginRight: 8,
    },
    dropdownArrow: {
        color: '#6b7280',
        fontSize: 10,
    },
    customInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1f2937',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3b82f6',
        paddingHorizontal: 12,
    },
    customInput: {
        color: '#ffffff',
        fontSize: 14,
        paddingVertical: 10,
        minWidth: 60,
        textAlign: 'center',
    },
    customInputSuffix: {
        color: '#9ca3af',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 16,
        minWidth: 200,
        maxWidth: '80%',
    },
    modalTitle: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    modalOptionSelected: {
        backgroundColor: '#3b82f6',
    },
    modalOptionText: {
        color: '#e5e7eb',
        fontSize: 14,
        textAlign: 'center',
    },
    modalOptionTextSelected: {
        color: '#ffffff',
        fontWeight: '600',
    },
});
