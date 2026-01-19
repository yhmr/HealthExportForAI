// エクスポート形式選択用チェックボックスコンポーネント

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface ExportFormatCheckboxProps {
    label: string;
    checked: boolean;
    onToggle: () => void;
    description?: string;
}

export function ExportFormatCheckbox({
    label,
    checked,
    onToggle,
    description,
}: ExportFormatCheckboxProps) {
    return (
        <TouchableOpacity style={styles.container} onPress={onToggle}>
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.labelContainer}>
                <Text style={styles.label}>{label}</Text>
                {description && <Text style={styles.description}>{description}</Text>}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: '#1e1e2e',
        borderRadius: 8,
        marginBottom: 8,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#4b5563',
        backgroundColor: '#161622',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxChecked: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    checkmark: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    labelContainer: {
        flex: 1,
    },
    label: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },
    description: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 2,
    },
});
