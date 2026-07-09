// 기존 BGM 버튼 수정 화면.
// HomeScreen에서 카드를 길게 눌러 진입하며, route.params.button으로 기존 값을 전달받아 폼을 채운다.
// 음원 파일은 선택적으로 교체할 수 있고(교체 시 기존 Storage 파일은 삭제), 삭제는 확인창을 거친다.
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorPicker } from '../components/ColorPicker';
import { ConfirmModal } from '../components/ConfirmModal';
import { IconPicker } from '../components/IconPicker';
import { LoopToggle } from '../components/LoopToggle';
import { PrimaryButton } from '../components/PrimaryButton';
import { VolumeSlider } from '../components/VolumeSlider';
import { theme } from '../constants/theme';
import { usePlayer } from '../context/PlayerContext';
import { RootStackParamList } from '../navigation/types';
import { removeCachedFile } from '../services/cacheService';
import { deleteButtonDoc, updateButton } from '../services/firestoreService';
import { deleteAudioFile, uploadAudioFile } from '../services/storageService';
import { isSupportedAudioFile, SUPPORTED_AUDIO_EXTENSIONS } from '../utils/audioFile';

type Props = NativeStackScreenProps<RootStackParamList, 'EditButton'>;

export function EditButtonScreen({ navigation, route }: Props) {
  const { button } = route.params;
  const { activeButtonId, stopAll } = usePlayer();

  const [title, setTitle] = useState(button.title);
  const [category, setCategory] = useState(button.category);
  const [color, setColor] = useState(button.color);
  const [icon, setIcon] = useState(button.icon);
  const [loop, setLoop] = useState(button.loop);
  const [volume, setVolume] = useState(button.volume);
  const [replacementFile, setReplacementFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  async function handlePickReplacementFile() {
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
    setReplacementFile(asset);
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedCategory = category.trim();
    if (!trimmedTitle || !trimmedCategory) {
      Alert.alert('입력 확인', '버튼 이름과 카테고리를 입력해주세요.');
      return;
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      let audioUrl: string | undefined;
      let storagePath: string | undefined;

      if (replacementFile) {
        const uploaded = await uploadAudioFile(
          replacementFile.uri,
          replacementFile.name,
          setUploadProgress
        );
        audioUrl = uploaded.audioUrl;
        storagePath = uploaded.storagePath;
      }

      await updateButton(button.id, {
        title: trimmedTitle,
        category: trimmedCategory,
        color,
        icon,
        loop,
        volume,
        ...(audioUrl && storagePath ? { audioUrl, storagePath } : {}),
      });

      // 음원이 교체됐다면, 기존 Storage 파일과 기존 캐시 파일은 더 이상 필요 없으므로 정리한다.
      if (storagePath) {
        await deleteAudioFile(button.storagePath);
        removeCachedFile(button);
        // 현재 재생 중이던 음원이 이 버튼이었다면, 이제 가리키는 파일이 바뀌었으니 정지시킨다.
        if (activeButtonId === button.id) {
          await stopAll();
        }
      }

      navigation.goBack();
    } catch (error) {
      console.warn('[EditButtonScreen] 저장 실패:', error);
      Alert.alert('저장 실패', '버튼을 저장하는 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmedDelete() {
    setConfirmDeleteVisible(false);
    setDeleting(true);
    try {
      if (activeButtonId === button.id) {
        await stopAll();
      }
      await deleteButtonDoc(button.id);
      await deleteAudioFile(button.storagePath);
      removeCachedFile(button);
      navigation.goBack();
    } catch (error) {
      console.warn('[EditButtonScreen] 삭제 실패:', error);
      Alert.alert('삭제 실패', '버튼을 삭제하는 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>버튼 수정</Text>

        <Field label="버튼 이름">
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={theme.colors.textMuted}
          />
        </Field>

        <Field label="카테고리">
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholderTextColor={theme.colors.textMuted}
          />
        </Field>

        <Field label="버튼 색상">
          <ColorPicker value={color} onChange={setColor} />
        </Field>

        <Field label="아이콘">
          <IconPicker value={icon} onChange={setIcon} />
        </Field>

        <Field label="음원 파일">
          <PrimaryButton
            label={replacementFile ? `교체될 파일: ${replacementFile.name}` : '음원 파일 교체 (선택)'}
            variant="secondary"
            onPress={handlePickReplacementFile}
          />
        </Field>

        <Field label="">
          <LoopToggle value={loop} onChange={setLoop} />
        </Field>

        <Field label="">
          <VolumeSlider value={volume} onChange={setVolume} />
        </Field>

        {saving && replacementFile && (
          <Text style={styles.progressText}>업로드 중... {Math.round(uploadProgress * 100)}%</Text>
        )}

        <PrimaryButton label="저장" onPress={handleSave} loading={saving} disabled={busy} />
        <PrimaryButton
          label="버튼 삭제"
          variant="danger"
          onPress={() => setConfirmDeleteVisible(true)}
          loading={deleting}
          disabled={busy}
        />
      </ScrollView>

      <ConfirmModal
        visible={confirmDeleteVisible}
        title="이 버튼을 삭제할까요?"
        message={`"${button.title}" 버튼과 연결된 음원 파일이 함께 삭제되며, 되돌릴 수 없습니다.`}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
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
  progressText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
