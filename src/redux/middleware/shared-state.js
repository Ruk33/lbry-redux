// @flow
import isEqual from 'util/deep-equal';
import { doPreferenceSet } from 'redux/actions/sync';

const SHARED_PREFERENCE_VERSION = '0.1';
let oldShared = {};

export const buildSharedStateMiddleware = (
  actions: Array<string>,
  sharedStateFilters: {},
  sharedStateCb?: any => void
) => ({ getState, dispatch }: { getState: () => { user: any }, dispatch: any => void }) => (
  next: ({}) => void
) => (action: { type: string, data: any }) => {
  const currentState = getState();

  // We don't care if sync is disabled here, we always want to backup preferences to the wallet
  if (!actions.includes(action.type) || typeof action === 'function') {
    return next(action);
  }

  const actionResult = next(action);
  // Call `getState` after calling `next` to ensure the state has updated in response to the action
  const nextState: { user: any } = getState();
  const preferenceKey =
    nextState.user && nextState.user.user && nextState.user.user.has_verified_email
      ? 'shared'
      : 'anon';
  const shared = {};

  Object.keys(sharedStateFilters).forEach(key => {
    const filter = sharedStateFilters[key];
    const { source, property, transform } = filter;
    let value = nextState[source][property];
    if (transform) {
      value = transform(value);
    }

    shared[key] = value;
  });

  if (!isEqual(oldShared, shared)) {
    // only update if the preference changed from last call in the same session
    oldShared = shared;
    doPreferenceSet(preferenceKey, shared, SHARED_PREFERENCE_VERSION);
  }

  if (sharedStateCb) {
    // Pass dispatch to the callback to consumers can dispatch actions in response to preference set
    sharedStateCb({ dispatch, getState });
  }

  return actionResult;
};
