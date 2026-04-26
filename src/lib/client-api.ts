interface ApiResult<T> {
  success: boolean;
  message?: string;
  data: T;
}

export async function postApiJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("未登录或登录已失效");
  }

  const json = (await res.json()) as ApiResult<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || "请求失败");
  }

  return json.data;
}

export async function getApiJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET" });

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("未登录或登录已失效");
  }

  const json = (await res.json()) as ApiResult<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || "请求失败");
  }

  return json.data;
}

export async function deleteApiJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE" });

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("未登录或登录已失效");
  }

  const json = (await res.json()) as ApiResult<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || "请求失败");
  }

  return json.data;
}
