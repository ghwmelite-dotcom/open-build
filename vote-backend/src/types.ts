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
  announce?: boolean; // when true, auto-post a "vote is open" message to the channel
}

export interface AnnounceBody {
  text: string;
}

export interface VoteBody {
  optionId: string;
  voterToken: string;
}

export interface SuggestBody {
  problem?: string;
  who?: string;
  handle?: string;
  link?: string;
  hp?: string; // honeypot — real users leave this empty; bots fill it
}

export interface Env {
  POLL: DurableObjectNamespace;
  ADMIN_SECRET: string;
  ALLOWED_ORIGIN: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;      // private suggestions group
  TELEGRAM_CHANNEL_ID: string;   // public announcements channel, e.g. "@openbuildch"
  PUBLIC_HUB_URL: string;        // hub URL used in announcement links
}
