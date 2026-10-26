import React, { act } from 'react';
import renderer from 'react-test-renderer';
import Separator from '../src/components/Separator';
import ConfirmModal from '../src/components/ConfirmModal';

import ActionMenuItem from '../src/components/ActionMenuItem';
import StatusBadge from '../src/components/StatusBadge';
import FloatingActionButton from '../src/components/FloatingActionButton';

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

  test('ActionMenuItem 컴포넌트가 정상 렌더링되어야 함', () => {
    let component;
    act(() => {
      component = renderer.create(
        <ActionMenuItem
          icon="printer"
          title="프린터로 인쇄"
          subtitle="시스템 인쇄 창을 엽니다"
          onPress={jest.fn()}
        />
      );
    });
    expect(component).toBeDefined();
    expect(component.toJSON()).toBeTruthy();
  });

  test('StatusBadge 컴포넌트가 각 상태(planned, done, active, paused)별로 정상 렌더링되어야 함', () => {
    ['planned', 'done', 'active', 'paused'].forEach((status) => {
      let component;
      act(() => {
        component = renderer.create(
          <StatusBadge status={status} size="sm" />
        );
      });
      expect(component).toBeDefined();
      expect(component.toJSON()).toBeTruthy();
    });
  });

  test('FloatingActionButton 컴포넌트가 원형 및 확장형으로 정상 렌더링되어야 함', () => {
    let circular;
    let extended;
    act(() => {
      circular = renderer.create(
        <FloatingActionButton icon="plus" onPress={jest.fn()} />
      );
      extended = renderer.create(
        <FloatingActionButton icon="user-plus" label="학생 추가" onPress={jest.fn()} />
      );
    });
    expect(circular).toBeDefined();
    expect(circular.toJSON()).toBeTruthy();
    expect(extended).toBeDefined();
    expect(extended.toJSON()).toBeTruthy();
  });
});

