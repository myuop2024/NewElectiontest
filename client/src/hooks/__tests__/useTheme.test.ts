import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../use-theme';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addListener: () => {},
      removeListener: () => {},
    })),
  });
});

describe('useTheme', () => {
  it('toggles between light and dark', () => {
    const { result } = renderHook(() => useTheme());

    const initial = result.current.theme;
    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).not.toBe(initial);
  });
});
