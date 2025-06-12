import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useEnhancedTraining } from '../useEnhancedTraining';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useEnhancedTraining', () => {
  it('should fetch programs and return them', async () => {
    // Arrange
    const mockPrograms = [{ id: 1, title: 'Test Program' }];
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPrograms),
    });

    // Act
    const { result } = renderHook(() => useEnhancedTraining(null), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.programsLoading).toBe(false);
      expect(result.current.programs).toEqual(mockPrograms);
    });

    expect(fetch).toHaveBeenCalledWith('/api/training/programs');
  });

  it('should handle errors when fetching programs', async () => {
    // Arrange
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server Error' }),
    });

    // Act
    const { result } = renderHook(() => useEnhancedTraining(null), {
        wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
        expect(result.current.programsLoading).toBe(false);
        // The hook itself doesn't expose the error state directly, but we can infer it
        // by checking that the data is the default empty array.
        // In a real app, you might want the hook to return the error object.
        expect(result.current.programs).toEqual([]);
    });
  });
}); 