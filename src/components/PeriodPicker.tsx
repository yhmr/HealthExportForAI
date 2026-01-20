// 期間選択コンポーネント

import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

// プリセット選択肢の値
const PERIOD_PRESET_VALUES = [1, 3, 7, 30, 90, 180, 365, -1] as const;

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
  const { t } = useLanguage();

  // プリセットのラベルを取得
  const getPresetLabel = (days: number): string => {
    if (days === -1) return t('periodPicker', 'custom');
    if (days === 365) return `1${t('periodPicker', 'year')}`;
    return `${days}${t('periodPicker', 'days')}`;
  };

  // 現在の値がプリセットにあるかチェック
  useEffect(() => {
    const isPreset = PERIOD_PRESET_VALUES.some((v) => v === value && v !== -1);
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
      return `${value}${t('periodPicker', 'days')}`;
    }
    return getPresetLabel(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('periodPicker', 'label')}</Text>

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
              placeholder={t('periodPicker', 'placeholder')}
              placeholderTextColor="#666"
              maxLength={4}
            />
            <Text style={styles.customInputSuffix}>
              {t('periodPicker', 'days').replace('日間', '日')}
            </Text>
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
            <Text style={styles.modalTitle}>{t('periodPicker', 'selectPeriod')}</Text>
            {PERIOD_PRESET_VALUES.map((presetValue) => (
              <TouchableOpacity
                key={presetValue}
                style={[
                  styles.modalOption,
                  value === presetValue && !isCustom && styles.modalOptionSelected,
                  presetValue === -1 && isCustom && styles.modalOptionSelected
                ]}
                onPress={() => handlePresetSelect(presetValue)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    (value === presetValue && !isCustom) || (presetValue === -1 && isCustom)
                      ? styles.modalOptionTextSelected
                      : null
                  ]}
                >
                  {getPresetLabel(presetValue)}
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
    marginBottom: 16
  },
  label: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151'
  },
  dropdownText: {
    color: '#e5e7eb',
    fontSize: 14,
    marginRight: 8
  },
  dropdownArrow: {
    color: '#6b7280',
    fontSize: 10
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingHorizontal: 12
  },
  customInput: {
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 10,
    minWidth: 60,
    textAlign: 'center'
  },
  customInputSuffix: {
    color: '#9ca3af',
    fontSize: 14
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    minWidth: 200,
    maxWidth: '80%'
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center'
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  modalOptionSelected: {
    backgroundColor: '#3b82f6'
  },
  modalOptionText: {
    color: '#e5e7eb',
    fontSize: 14,
    textAlign: 'center'
  },
  modalOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '600'
  }
});
