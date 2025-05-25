import { API_BASE_URL } from "../config";

export async function handleResendLink(email: string | null | undefined, setLoading?: (v: boolean) => void) {
  if (!email) {
    alert("Missing email. Please sign up again or contact support.");
    return;
  }  
  
  try {
    setLoading?.(true);

    const res = await fetch(`${API_BASE_URL}/auth/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Verification email resent. Link valid for 15 minutes.");
      } else {
        const message = data.error
        ? `${data.error}`
        : "Resend failed.\nPlease contact support";

        alert(message);
      }
      
    } catch (err) {
      console.error(err);
      alert("Error contacting server.\nPlease contact support");
  }finally {
    setLoading?.(false);
  }
}