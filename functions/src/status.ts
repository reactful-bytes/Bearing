import {
  CallableIdentityRequest,
  requireAuthenticatedCaller,
} from "./security";

export type BackendStatus = {
  authenticated: true;
  status: "ok";
};

export function getBackendStatus(
  request: CallableIdentityRequest,
): BackendStatus {
  requireAuthenticatedCaller(request);

  return {
    authenticated: true,
    status: "ok",
  };
}
