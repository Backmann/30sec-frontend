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
  async getQuestions(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request<any[]>(`/questions${q}`);
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
  async getLiveState(tournamentId: string) {
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
