// 同期ボタンコンポーネント

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface SyncButtonProps {
    onPress: () => void;
    isLoading: boolean;
    label: string;
    icon?: string;
    variant?: 'primary' | 'secondary';
}

export function SyncButton({
    onPress,
    isLoading,
    label,
    icon,
    variant = 'primary',
}: SyncButtonProps) {
    const buttonStyle = variant === 'primary' ? styles.primaryButton : styles.secondaryButton;
    const textStyle = variant === 'primary' ? styles.primaryText : styles.secondaryText;

    return (
        <TouchableOpacity
            style={[styles.button, buttonStyle, isLoading && styles.disabled]}
            onPress={onPress}
            disabled={isLoading}
            activeOpacity={0.7}
        >
            {isLoading ? (
                <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#6366f1'} />
            ) : (
                <>
                    {icon && <Text style={styles.icon}>{icon}</Text>}
                    <Text style={[styles.label, textStyle]}>{label}</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginVertical: 8,
        marginHorizontal: 16,
    },
    primaryButton: {
        backgroundColor: '#6366f1',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#6366f1',
    },
    disabled: {
        opacity: 0.6,
    },
    icon: {
        fontSize: 20,
        marginRight: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
    },
    primaryText: {
        color: '#ffffff',
    },
    secondaryText: {
        color: '#6366f1',
    },
});
