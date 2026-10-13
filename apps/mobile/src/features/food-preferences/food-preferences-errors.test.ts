import { foodPreferencesErrorMessage } from './food-preferences-errors';

import { ApiError, NetworkError } from '@/lib/api-client';

describe('foodPreferencesErrorMessage', () => {
  it.each([
    ['ingredient_in_both_lists', 'no puede estar a la vez'],
    ['unknown_ingredient', 'ya no está disponible'],
  ])('explains the "%s" error', (code, message) => {
    expect(foodPreferencesErrorMessage(new ApiError(400, code))).toContain(message);
  });

  it('explains a connection failure', () => {
    expect(foodPreferencesErrorMessage(new NetworkError())).toContain('No hemos podido conectar');
  });

  it.each([new ApiError(500), new ApiError(400), new ApiError(400, 'something_new'), 'boom'])(
    'falls back to a generic message for %p',
    (error) => {
      expect(foodPreferencesErrorMessage(error)).toContain('error inesperado');
    },
  );
});
