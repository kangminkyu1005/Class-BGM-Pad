// 새 BGM 버튼 추가 화면.
// 흐름: 폼 입력 -> 음원 파일 선택(mp3/wav/m4a) -> Firebase Storage 업로드 -> Firestore 문서 생성.
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorPicker } from '../components/ColorPicker';
import { IconPicker } from '../components/IconPicker';
import { LoopToggle } from '../components/LoopToggle';
import { PrimaryButton } from '../components/PrimaryButton';
import { VolumeSlider } from '../components/VolumeSlider';
import { BUTTON_COLORS, BUTTON_ICONS, SUGGESTED_CATEGORIES } from '../constants/buttonOptions';
import { theme } from '../constants/theme';
import { createButton } from '../services/firestoreService';
import { DEFAULT_SETTINGS, getSettings } from '../services/settingsService';
import { uploadAudioFile } from '../services/storageService';
import { RootStackParamList } from '../navigation/types';
import { isSupportedAudioFile, SUPPORTED_AUDIO_EXTENSIONS } from '../utils/audioFile';

type Props = NativeStackScreenProps<RootStackParamList, 'AddButton'>;

export function AddButtonScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(BUTTON_COLORS[0]);
  const [icon, setIcon] = useState(BUTTON_ICONS[0]);
  const [loop, setLoop] = useState(DEFAULT_SETTINGS.defaultLoop);
  const [volume, setVolume] = useState(DEFAULT_SETTINGS.defaultVolume);
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((settings) => {
      setLoop(settings.defaultLoop);
      setVolume(settings.defaultVolume);
    });
  }, []);

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!isSupportedAudioFile(asset.name)) {
      Alert.alert(
        '지원하지 않는 파일 형식',
        `${SUPPORTED_AUDIO_EXTENSIONS.join(', ')} 형식의 파일만 사용할 수 있습니다.`
      );
      return;
    }
    setPickedFile(asset);
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedCategory = category.trim();

    if (!trimmedTitle) {
      Alert.alert('입력 확인', '버튼 이름을 입력해주세요.');
      return;
    }
    if (!trimmedCategory) {
      Alert.alert('입력 확인', '카테고리를 입력해주세요.');
      return;
    }
    if (!pickedFile) {
      Alert.alert('입력 확인', '음원 파일을 선택해주세요.');
      return;
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const { audioUrl, storagePath } = await uploadAudioFile(
        pickedFile.uri,
        pickedFile.name,
        setUploadProgress
      );
      await createButton({
        title: trimmedTitle,
        category: trimmedCategory,
        loop,
        volume,
        color,
        icon,
        audioUrl,
        storagePath,
      });
      navigation.goBack();
    } catch (error) {
      console.warn('[AddButtonScreen] 저장 실패:', error);
      Alert.alert('저장 실패', '버튼을 저장하는 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>새 BGM 버튼 추가</Text>

        <Field label="버튼 이름">
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="예: 수업 시작 음악"
            placeholderTextColor={theme.colors.textMuted}
          />
        </Field>

        <Field label="카테고리">
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="예: 입장/퇴장"
            placeholderTextColor={theme.colors.textMuted}
          />
          <View style={styles.suggestionRow}>
            {SUGGESTED_CATEGORIES.map((suggestion) => (
              <Text
                key={suggestion}
                style={styles.suggestionChip}
                onPress={() => setCategory(suggestion)}
              >
                {suggestion}
              </Text>
            ))}
          </View>
        </Field>

        <Field label="버튼 색상">
          <ColorPicker value={color} onChange={setColor} />
        </Field>

        <Field label="아이콘">
          <IconPicker value={icon} onChange={setIcon} />
        </Field>

        <Field label="음원 파일 (mp3, wav, m4a)">
          <PrimaryButton
            label={pickedFile ? `선택됨: ${pickedFile.name}` : '음원 파일 선택'}
            variant="secondary"
            onPress={handlePickFile}
          />
        </Field>

        <Field label="">
          <LoopToggle value={loop} onChange={setLoop} />
        </Field>

        <Field label="">
          <VolumeSlider value={volume} onChange={setVolume} />
        </Field>

        {saving && (
          <Text style={styles.progressText}>업로드 중... {Math.round(uploadProgress * 100)}%</Text>
        )}

        <PrimaryButton label="저장" onPress={handleSave} loading={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing(2.5),
    gap: theme.spacing(2.5),
  },
  screenTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  field: {
    gap: theme.spacing(1),
  },
  fieldLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(1.25),
    color: theme.colors.text,
    fontSize: 15,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
  },
  suggestionChip: {
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: theme.spacing(1.25),
    paddingVertical: theme.spacing(0.5),
    fontSize: 12,
    overflow: 'hidden',
  },
  progressText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
