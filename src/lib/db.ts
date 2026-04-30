import { auth } from "./firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export interface Resource {
  id?: string | number;
  type: "image" | "slide" | "test" | "chat";
  title: string;
  prompt: string;
  content: string;
  author_id: string;
  author_name: string;
  author_photo?: string;
  is_public: boolean;
  created_at?: string;
}

function getCurrentUser() {
  const user = auth.currentUser;
  if (user) {
    return { uid: user.uid, displayName: user.displayName || "Foydalanuvchi", photoURL: user.photoURL };
  }
  // Firebase sozlanmagan yoki login qilinmagan — mehmon sifatida davom etish
  return { uid: "guest", displayName: "Mehmon", photoURL: null };
}

export async function saveResource(resource: Omit<Resource, 'author_id' | 'author_name' | 'author_photo' | 'is_public'>) {
  const user = getCurrentUser();

  try {
    const response = await fetch(`${API_URL}/resources/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...resource,
        author_id: user.uid,
        author_name: user.displayName,
        author_photo: user.photoURL,
        is_public: false,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.id;
    }
  } catch (error) {
    console.warn("Backend server is not available. Running in stateless mode.");
  }
  return Date.now(); // Mock ID qaytarish
}

export async function togglePublic(id: string | number, isPublic: boolean) {
  try {
    const response = await fetch(`${API_URL}/resources/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: isPublic }),
    });

    if (response.ok) return await response.json();
  } catch (error) {
    console.warn("Backend server is not available. Status not toggled.");
  }
  return { id, is_public: isPublic };
}

export async function fetchResources(limitCount = 30): Promise<Resource[]> {
  try {
    const response = await fetch(`${API_URL}/resources/?is_public=true&limit=${limitCount}`);
    if (response.ok) return await response.json();
  } catch {
    console.warn("Backend server is not available. Cannot fetch resources.");
  }
  return [];
}

export async function fetchUserResources(): Promise<Resource[]> {
  const user = getCurrentUser();
  if (user.uid === "guest") return [];

  try {
    const response = await fetch(`${API_URL}/resources/?author_id=${user.uid}`);
    if (response.ok) return await response.json();
  } catch {
    console.warn("Backend server is not available. Cannot fetch user resources.");
  }
  return [];
}
