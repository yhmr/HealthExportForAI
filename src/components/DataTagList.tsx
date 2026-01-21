// データタグ一覧コンポーネント

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { type DataTagKey, ALL_DATA_TAGS, DATA_TAG_ICONS } from '../stores/healthStore';
import type { HealthData } from '../types/health';

interface DataTagListProps {
  healthData: HealthData;
  selectedTags: Set<DataTagKey>;
  onToggleTag: (tag: DataTagKey) => void;
}

/**
 * データタグ一覧を表示するコンポーネント
 * 各タグには取得件数とチェックボックスを表示
 */
export function DataTagList({ healthData, selectedTags, onToggleTag }: DataTagListProps) {
  const { t } = useLanguage();

  // タグごとのデータ件数を取得
  const getDataCount = (tag: DataTagKey): number => {
    const data = healthData[tag];
    return Array.isArray(data) ? data.length : 0;
  };

  // タグの翻訳ラベルを取得
  const getTagLabel = (tag: DataTagKey): string => {
    return t('dataTypes', tag);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('dataTagList', 'title')}</Text>
      <View style={styles.tagList}>
        {ALL_DATA_TAGS.map((tag) => {
          const icon = DATA_TAG_ICONS[tag];
          const count = getDataCount(tag);
          const isSelected = selectedTags.has(tag);
          const hasData = count > 0;

          return (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagItem,
                isSelected && styles.tagItemSelected,
                !hasData && styles.tagItemNoData
              ]}
              onPress={() => onToggleTag(tag)}
              activeOpacity={0.7}
            >
              {/* チェックボックス */}
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>

              {/* アイコンとラベル */}
              <Text style={styles.icon}>{icon}</Text>
              <Text style={[styles.label, !hasData && styles.labelNoData]}>{getTagLabel(tag)}</Text>

              {/* 件数バッジ */}
              <View
                style={[
                  styles.countBadge,
                  hasData ? styles.countBadgeActive : styles.countBadgeEmpty
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    hasData ? styles.countTextActive : styles.countTextEmpty
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12
  },
  title: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center'
  },
  tagList: {
    gap: 8
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151'
  },
  tagItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f'
  },
  tagItemNoData: {
    opacity: 0.6
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  checkboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  icon: {
    fontSize: 20,
    marginRight: 10
  },
  label: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 16
  },
  labelNoData: {
    color: '#6b7280'
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center'
  },
  countBadgeActive: {
    backgroundColor: '#10b981'
  },
  countBadgeEmpty: {
    backgroundColor: '#374151'
  },
  countText: {
    fontSize: 12,
    fontWeight: '600'
  },
  countTextActive: {
    color: '#ffffff'
  },
  countTextEmpty: {
    color: '#6b7280'
  }
});
