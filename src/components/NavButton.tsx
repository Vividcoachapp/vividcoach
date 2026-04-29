import { TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';

interface NavButtonProps {
  direction: 'back' | 'close';
  onPress: () => void;
}

export function NavButton({ direction, onPress }: NavButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={8}
      style={styles.btn}
      activeOpacity={0.7}
    >
      <Ionicons
        name={direction === 'back' ? 'chevron-back' : 'close'}
        size={24}
        color={colors.textPrimary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
