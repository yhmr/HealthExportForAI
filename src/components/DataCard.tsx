// データ表示カードコンポーネント

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DataCardProps {
    title: string;
    value: string;
    unit?: string;
    icon?: string;
}

export function DataCard({ title, value, unit, icon }: DataCardProps) {
    return (
        <View style={styles.card}>
            {icon && <Text style={styles.icon}>{icon}</Text>}
            <Text style={styles.title}>{title}</Text>
            <View style={styles.valueContainer}>
                <Text style={styles.value}>{value}</Text>
                {unit && <Text style={styles.unit}>{unit}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1e1e2e',
        borderRadius: 16,
        padding: 16,
        flex: 1,
        minWidth: 140,
        margin: 6,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    icon: {
        fontSize: 24,
        marginBottom: 8,
    },
    title: {
        fontSize: 14,
        color: '#a0a0b0',
        marginBottom: 8,
        textAlign: 'center',
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    value: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    unit: {
        fontSize: 14,
        color: '#a0a0b0',
        marginLeft: 4,
    },
});
