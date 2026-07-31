import { CallableIdentityRequest, requireVerifiedCaller } from "./security";

export type BackendStatus = {
  authenticated: true;
  status: "ok";
};

export function getBackendStatus(
  request: CallableIdentityRequest,
): BackendStatus {
  requireVerifiedCaller(request);

  return {
    authenticated: true,
    status: "ok",
  };
}
