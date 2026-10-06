import React, { act } from 'react';
import renderer from 'react-test-renderer';
import Separator from '../src/components/Separator';
import ConfirmModal from '../src/components/ConfirmModal';

describe('공통 컴포넌트 단위 테스트', () => {
  test('Separator 컴포넌트가 오류 없이 렌더링되어야 함', () => {
    let component;
    act(() => {
      component = renderer.create(<Separator />);
    });
    expect(component).toBeDefined();
    expect(component.toJSON()).toBeTruthy();
  });

  test('ConfirmModal 컴포넌트가 visible=false일 때 정상 렌더링되어야 함', () => {
    let component;
    act(() => {
      component = renderer.create(
        <ConfirmModal
          visible={false}
          title="테스트 제목"
          message="테스트 메시지"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
    });
    expect(component).toBeDefined();
  });

  test('ConfirmModal 컴포넌트가 destructive 모드에서 정상 렌더링되어야 함', () => {
    let component;
    act(() => {
      component = renderer.create(
        <ConfirmModal
          visible={true}
          title="삭제 확인"
          message="정말 삭제하시겠습니까?"
          isDestructive={true}
          confirmText="삭제하기"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
    });
    expect(component).toBeDefined();
  });
});
