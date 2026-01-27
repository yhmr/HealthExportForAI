import { StyleSheet } from 'react-native';

export const onboardingStyles = StyleSheet.create({
  stepContainer: {
    alignItems: 'center',
    gap: 24,
    width: '100%',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center'
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300
  },
  completedState: {
    alignItems: 'center',
    gap: 16,
    width: '100%'
  },
  successText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '500'
  },
  actionContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center'
  },
  warningText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    maxWidth: 280,
    lineHeight: 20
  },
  folderSelection: {
    backgroundColor: '#1e1e2e',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    gap: 8
  },
  folderLabel: {
    color: '#6b7280',
    fontSize: 14
  },
  folderName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600'
  },
  spacer: {
    height: 24
  },
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16
  },
  cardTitle: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  formatOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e3e'
  },
  formatLabel: {
    color: '#ffffff',
    fontSize: 16
  },
  subOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e3e'
  },
  subOptionLabel: {
    color: '#9ca3af',
    fontSize: 14
  }
});
