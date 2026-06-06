export interface PollOption {
  id: string;
  name: string;
  icon?: string;
  desc?: string;
  by?: string;
}

export interface PollStateResponse {
  id: string;
  options: PollOption[];
  counts: Record<string, number>;
  total: number;
  deadline: string | null;
  closed: boolean;
}

export interface InitBody {
  options: PollOption[];
  deadline?: string | null;
  reset?: boolean;
}

export interface VoteBody {
  optionId: string;
  voterToken: string;
}

export interface Env {
  POLL: DurableObjectNamespace;
  ADMIN_SECRET: string;
  ALLOWED_ORIGIN: string;
}
