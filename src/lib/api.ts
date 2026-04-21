const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://30sec.org/api';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    // Try refresh on 401
    if (res.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        const retryRes = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers,
        });
        if (!retryRes.ok) {
          const error = await retryRes.json().catch(() => ({}));
          throw new ApiError(retryRes.status, error.message || 'Request failed');
        }
        return retryRes.json();
      } else {
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        throw new ApiError(401, 'Session expired');
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new ApiError(res.status, error.message || 'Request failed');
    }

    return res.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Auth ─────────────────────────────────────
  async register(data: {
    email: string; password: string; firstName: string;
    lastName: string; nickname: string; language?: string; countryCode?: string;
  }) {
    const result = await this.request<any>('/auth/register', {
      method: 'POST', body: JSON.stringify(data),
    });
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<any>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }


  async googleLogin(credential: string) {
    const result = await this.request<any>('/auth/google', {
      method: 'POST', body: JSON.stringify({ credential }),
    });
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  logout() {
    this.clearTokens();
  }

  // ─── Profile ──────────────────────────────────
  async getMyProfile() { return this.request<any>('/me/profile'); }
  async updateProfile(data: any) {
    return this.request<any>('/me/profile', { method: 'PATCH', body: JSON.stringify(data) });
  }
  async getMyStats() { return this.request<any>('/me/stats'); }
  async getMyAnswerHistory(page = 1) { return this.request<any>(`/me/history/answers?page=${page}`); }
  async getMyTournamentHistory() { return this.request<any>('/me/history/tournaments'); }
  async getPublicProfile(nickname: string) { return this.request<any>(`/players/${nickname}`); }

  // ─── Tournaments ──────────────────────────────
  async getTournaments(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request<any[]>(`/tournaments${q}`);
  }
  async getTournament(id: string) { return this.request<any>(`/tournaments/${id}`); }
  async joinTournament(id: string) {
    return this.request<any>(`/tournaments/${id}/join`, { method: 'POST' });
  }
  async getLeaderboard(id: string) { return this.request<any[]>(`/tournaments/${id}/leaderboard`); }

  // Admin tournament
  async createTournament(data: any) {
    return this.request<any>('/tournaments', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateTournament(id: string, data: any) {
    return this.request<any>(`/tournaments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
  async startTournament(id: string) {
    return this.request<any>(`/tournaments/${id}/start`, { method: 'POST' });
  }
  async finishTournament(id: string) {
    return this.request<any>(`/tournaments/${id}/finish`, { method: 'POST' });
  }
  async deleteTournament(id: string) {
    return this.request<any>(`/tournaments/${id}`, { method: 'DELETE' });
  }
  async launchQuestion(id: string) {
    return this.request<any>(`/tournaments/${id}/launch-question`, { method: 'POST' });
  }
  async approveParticipant(pid: string) {
    return this.request<any>(`/tournaments/participants/${pid}/approve`, { method: 'POST' });
  }
  async rejectParticipant(pid: string) {
    return this.request<any>(`/tournaments/participants/${pid}/reject`, { method: 'POST' });
  }
  async getAdminLiveState(id: string) {
    return this.request<any>(`/tournaments/${id}/live-state`);
  }
  async getPublicLive(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/tournaments/${id}/public-live`);
    if (!res.ok) throw new Error('Public live not available');
    return res.json();
  }
  async getGameState(id: string) {
    return this.request<any>(`/tournaments/${id}/game-state`);
  }
  async fillTestQuestions(id: string) {
    return this.request<any>(`/tournaments/${id}/fill-test-questions`, { method: 'POST' });
  }
  async getCurrentQuestion(id: string) {
    return this.request<any>(`/tournaments/${id}/current-question`);
  }
  async markQuestionUsed(tqId: string) {
    return this.request<any>(`/tournaments/question/${tqId}/mark-used`, { method: 'POST' });
  }

  // ─── Questions ────────────────────────────────
  async createQuestion(data: any) {
    return this.request<any>('/questions', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateQuestion(id: string, data: any) {
    return this.request<any>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  async deleteQuestion(id: string) {
    return this.request<any>(`/questions/${id}`, { method: 'DELETE' });
  }
  async removeQuestionFromTournament(tournamentQuestionId: string) {
    return this.request<any>(`/questions/tournament-question/${tournamentQuestionId}`, { method: 'DELETE' });
  }
  async getArchiveDetails(questionId: string) {
    return this.request<any>(`/questions/${questionId}/archive-details`);
  }
  async returnQuestionToLibrary(questionId: string) {
    return this.request<any>(`/questions/${questionId}/return-to-library`, { method: 'POST' });
  }
  async getQuestions(opts: { status?: string; search?: string; onlyUnused?: boolean; sort?: 'new' | 'old'; location?: 'library' | 'archive' | 'all'; tournamentId?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.status) params.set('status', opts.status);
    if (opts.search) params.set('search', opts.search);
    if (opts.onlyUnused) params.set('onlyUnused', 'true');
    if (opts.sort) params.set('sort', opts.sort);
    if (opts.location) params.set('location', opts.location);
    if (opts.tournamentId) params.set('tournamentId', opts.tournamentId);
    const qs = params.toString();
    return this.request<any[]>(`/questions${qs ? '?' + qs : ''}`);
  }
  async getArchiveTournaments() {
    return this.request<any[]>('/questions/archive/tournaments');
  }
  async getQuestion(id: string) {
    return this.request<any>(`/questions/${id}`);
  }
  async extendReading(tournamentId: string) {
    return this.request<any>(`/tournaments/${tournamentId}/extend-reading`, { method: 'POST' });
  }
  async bulkAddToTournament(tournamentId: string, questionIds: string[]) {
    return this.request<any>('/questions/bulk-add-to-tournament', {
      method: 'POST', body: JSON.stringify({ tournamentId, questionIds }),
    });
  }
  async autoFillTournament(tournamentId: string, count = 23) {
    return this.request<any>('/questions/auto-fill-tournament', {
      method: 'POST', body: JSON.stringify({ tournamentId, count }),
    });
  }
  // ─── Votes (best-question voting after match) ──
  async getVoteResults(tournamentId: string) {
    return this.request<any>(`/votes/results/${tournamentId}`);
  }
  async getMyVote(tournamentId: string) {
    return this.request<any>(`/votes/my-vote/${tournamentId}`);
  }
  async castVote(tournamentId: string, questionId: string) {
    return this.request<any>('/votes', {
      method: 'POST', body: JSON.stringify({ tournamentId, questionId }),
    });
  }

  // ─── Image uploads (R2) ─────────────────────────
  async getPresignedUploadUrl(opts: { category: 'question' | 'answer'; contentType: string; contentLength?: number }) {
    return this.request<{ uploadUrl: string; publicUrl: string; key: string }>('/uploads/presigned', {
      method: 'POST',
      body: JSON.stringify(opts),
    });
  }

  // Resize image to max 1200px (long side) and compress to JPEG ~85% quality
  private async resizeImage(file: File, maxSize = 1200, quality = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas not supported'));
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Blob failed'))),
            'image/jpeg',
            quality,
          );
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Read failed'));
      reader.readAsDataURL(file);
    });
  }

  // Full upload cycle: resize → get presigned → PUT to R2 → return the public URL + r2 key
  async uploadImage(file: File, category: 'question' | 'answer') {
    if (!file.type.startsWith('image/')) throw new Error('Только изображения');
    if (file.size > 5 * 1024 * 1024) throw new Error('Максимум 5 MB');

    // Resize in browser (to reduce upload time and R2 storage)
    let blob: Blob;
    let contentType: string;
    try {
      blob = await this.resizeImage(file);
      contentType = 'image/jpeg';
    } catch (e) {
      // Fallback to original if resize fails
      blob = file;
      contentType = file.type;
    }

    const { uploadUrl, publicUrl, key } = await this.getPresignedUploadUrl({
      category,
      contentType,
      contentLength: blob.size,
    });
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });
    if (!putRes.ok) throw new Error(`Ошибка загрузки: ${putRes.status}`);
    return { url: publicUrl, r2Key: key };
  }

  async deleteImage(r2Key: string) {
    return this.request<any>(`/uploads/${encodeURIComponent(r2Key)}`, { method: 'DELETE' });
  }
  async addQuestionToTournamentForced(tournamentId: string, questionId: string, force = false): Promise<any> {
    return this.request<any>('/questions/add-to-tournament', {
      method: 'POST',
      body: JSON.stringify({ tournamentId, questionId, force }),
    });
  }
  async addQuestionToTournament(tournamentId: string, questionId: string) {
    return this.request<any>('/questions/add-to-tournament', {
      method: 'POST', body: JSON.stringify({ tournamentId, questionId }),
    });
  }

  // ─── Answers ──────────────────────────────────
  async submitAnswer(tournamentId: string, questionId: string, answerText: string) {
    return this.request<any>('/answers/submit', {
      method: 'POST', body: JSON.stringify({ tournamentId, questionId, answerText }),
    });
  }
  async getMyAnswers(tournamentId: string) {
    return this.request<any[]>(`/answers/my/${tournamentId}`);
  }
  async getAnswersForQuestion(tournamentId: string, questionId: string) {
    return this.request<any[]>(`/answers/tournament/${tournamentId}/question/${questionId}`);
  }

  // ─── Judgements ───────────────────────────────
  async judgeAnswer(answerId: string, decision: 'ACCEPTED' | 'REJECTED', reasonCode?: string) {
    return this.request<any>('/judgements', {
      method: 'POST', body: JSON.stringify({ answerId, decision, reasonCode }),
    });
  }
  async undoJudgement(judgementId: string) {
    return this.request<any>(`/judgements/${judgementId}/undo`, { method: 'DELETE' });
  }

  // ─── Spectator ────────────────────────────────
  async getSpectatorLiveState(tournamentId: string) {
    return this.request<any>(`/spectator/live/${tournamentId}`);
  }

  // ─── Reactions ────────────────────────────────
  async getReactionTypes() { return this.request<any[]>('/reactions/types'); }
  async setReaction(tournamentId: string, questionId: string, reactionCode: string) {
    return this.request<any>('/reactions', {
      method: 'POST', body: JSON.stringify({ tournamentId, questionId, reactionCode }),
    });
  }

  // ─── Ranks & Leaderboard ──────────────────────
  async getRanks() { return this.request<any[]>('/ranks'); }
  async getGlobalLeaderboard(limit = 50) { return this.request<any[]>(`/leaderboard?limit=${limit}`); }


  // ─── Notifications ────────────────────────────
  async getNotifications(page = 1) {
    return this.request<any>(`/notifications?page=${page}`);
  }
  async getNotificationsUnreadCount() {
    return this.request<{ count: number }>('/notifications/unread-count');
  }
  async markNotificationRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'POST' });
  }
  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', { method: 'POST' });
  }

  // ─── Admin ────────────────────────────────────
  async getAdminDashboard() { return this.request<any>('/admin/dashboard'); }
  async getAdminLogs(page = 1) { return this.request<any>(`/admin/logs?page=${page}`); }
  async getAdminUsers(page = 1) { return this.request<any>(`/admin/users?page=${page}`); }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string | string[]) {
    super(Array.isArray(message) ? message[0] : message);
    this.status = status;
  }
}

export const api = new ApiClient();
