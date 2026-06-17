import React, { useState, useEffect } from 'react';
import type { RepoEvent } from '../../types';
import { eventsService } from '../../services/api/events';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Users, Clock, ChevronDown, MoreHorizontal } from 'lucide-react';
import { GitBranchIcon } from '@primer/octicons-react';
import { shortenHash } from '../../utils/stringUtils';
import { Avatar } from '../shared/Avatar';

interface ActivityPageProps {
  repoId: string;
}

export const ActivityPage: React.FC<ActivityPageProps> = ({ repoId }) => {
  const [events, setEvents] = useState<RepoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const data = await eventsService.getRepoEvents(repoId);
        setEvents(data);
        setError(null);
      } catch (err) {
        setError('Failed to load activity');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [repoId]);

  const parsePayload = (event: RepoEvent) => {
    if (typeof event.payload === 'string') {
        try {
            return JSON.parse(event.payload);
        } catch(e) { return {}; }
    }
    return event.payload || {};
  };

  const renderEventItem = (event: RepoEvent, isLast: boolean) => {
    const actorName = event.actor?.username || 'Unknown';
    const payload = parsePayload(event);
    
    // Safety fallback in case backend hasn't been rebuilt with json tags yet
    const rawDate = event.created_at || (event as any).CreatedAt;
    const createdDate = rawDate ? new Date(rawDate) : new Date();
    const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });
    
    let title = '';
    let subtitle = null;
    
    if (event.event_type === 'branch_creation') {
      title = 'Created branch';
      subtitle = (
        <>
          <span className="font-semibold text-[var(--text-primary)]">{actorName}</span> created <span className="bg-[var(--surface-info-subtle)] text-[var(--text-link)] px-1.5 py-0.5 rounded font-mono text-xs">{payload.ref}</span> • {payload.hash ? shortenHash(payload.hash) + ' • ' : ''}{timeAgo}
        </>
      );
    } else if (event.event_type === 'branch_deletion') {
      title = 'Deleted branch';
      subtitle = (
        <>
          <span className="font-semibold text-[var(--text-primary)]">{actorName}</span> deleted <span className="bg-[var(--surface-info-subtle)] text-[var(--text-link)] px-1.5 py-0.5 rounded font-mono text-xs">{payload.ref}</span> • {timeAgo}
        </>
      );
    } else if (event.event_type === 'direct_push') {
      title = payload.commit_message || `Pushed to ${payload.ref}`;
      subtitle = (
        <>
          <span className="font-semibold text-[var(--text-primary)]">{actorName}</span> pushed to <span className="bg-[var(--surface-info-subtle)] text-[var(--text-link)] px-1.5 py-0.5 rounded font-mono text-xs">{payload.ref}</span> • {payload.new_hash ? shortenHash(payload.new_hash) + ' • ' : ''}{timeAgo}
        </>
      );
    } else if (event.event_type === 'pr_merge') {
      title = payload.title || `Merged pull request #${payload.pull_number || '?'}`;
      subtitle = (
        <>
          <span className="font-semibold text-[var(--text-primary)]">{actorName}</span> merged to <span className="bg-[var(--surface-info-subtle)] text-[var(--text-link)] px-1.5 py-0.5 rounded font-mono text-xs">{payload.target_branch}</span> • {timeAgo}
        </>
      );
    } else {
      title = `Event: ${event.event_type}`;
      subtitle = (
        <>
          <span className="font-semibold text-[var(--text-primary)]">{actorName}</span> performed this action • {timeAgo}
        </>
      );
    }

    return (
      <div key={event.id} className={`flex items-start justify-between p-4 ${!isLast ? 'border-b border-[var(--border-default)]' : ''}`}>
        <div className="flex flex-col gap-1.5 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate" title={title}>
            {title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Avatar username={actorName} size={16} />
            <span className="truncate">{subtitle}</span>
          </div>
        </div>
        <button type="button" className="shrink-0 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors" aria-label="More options">
          <MoreHorizontal size={16} />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 bg-red-50 rounded-lg">{error}</div>;
  }

  return (
    <div className="w-full">
      <div className="flex flex-col mb-4">
        <h2 className="text-xl font-normal text-[var(--text-primary)] pb-4 border-b border-[var(--border-default)]">Activity</h2>
        
        <div className="flex flex-wrap items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium bg-[var(--surface-default)] border border-[var(--border-default)] rounded-md hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] transition-colors">
              <GitBranchIcon size={16} className="text-[var(--text-muted)]" />
              All branches
              <ChevronDown size={14} className="text-[var(--text-muted)] ml-1" />
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium bg-[var(--surface-default)] border border-[var(--border-default)] rounded-md hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] transition-colors">
              <Activity size={16} className="text-[var(--text-muted)]" />
              All activity
              <ChevronDown size={14} className="text-[var(--text-muted)] ml-1" />
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium bg-[var(--surface-default)] border border-[var(--border-default)] rounded-md hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] transition-colors">
              <Users size={16} className="text-[var(--text-muted)]" />
              All users
              <ChevronDown size={14} className="text-[var(--text-muted)] ml-1" />
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium bg-[var(--surface-default)] border border-[var(--border-default)] rounded-md hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] transition-colors">
              <Clock size={16} className="text-[var(--text-muted)]" />
              All time
              <ChevronDown size={14} className="text-[var(--text-muted)] ml-1" />
            </button>
          </div>
          <div className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1 mt-2 sm:mt-0 cursor-pointer hover:text-[var(--text-primary)]">
            Showing most recent first
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 border border-[var(--border-default)] rounded-md bg-[var(--surface-subtle)]">
          <p className="text-[var(--text-secondary)]">No activity found for this repository.</p>
        </div>
      ) : (
        <div className="border border-[var(--border-default)] rounded-md bg-[var(--surface-default)]">
          {events.map((event, index) => renderEventItem(event, index === events.length - 1))}
        </div>
      )}
    </div>
  );
};
