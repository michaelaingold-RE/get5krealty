// Shingle runtime config. Phone verification stays OFF until the Twilio and Turnstile secrets exist in Cloudflare Pages.
// To turn it on: set otpGate to true and paste the public Turnstile site key below (see /workspace/fsbo-toolkit/otp-setup.md).
window.SHINGLE_CFG = { otpGate: true, turnstileSiteKey: '0x4AAAAAAFXpvbCpe-81k5K6' };
