// 네비게이션 스택에서 사용하는 화면 이름과, 각 화면이 받는 파라미터 타입 정의.
import { BgmButton } from '../types';

export type RootStackParamList = {
  Home: undefined;
  AddButton: undefined;
  EditButton: { button: BgmButton };
  Settings: undefined;
};
