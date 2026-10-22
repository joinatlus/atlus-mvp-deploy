
export type UserBatchResult = {
        user_id: string;
        status: 'ok' | 'failed';
        duration_ms: number;
        error?: string;
        [key: string]: unknown;
};

type BatchOptions = {
        supabase: any;
        cursor?: string | null;
        limit?: number;
        concurrency?: number;
        maxRuntimeMs?: number;
        processUser: (
                userId: string
        ) => Promise<Record<string, unknown> | void>;
};

function messageFromError(error: unknown): string {
        return error instanceof Error
                ? error.message
                : String(error);
}

export async function runUserBatch(options: BatchOptions) {
        const startedAt = Date.now();

        const limit = Math.min(
                50,
                Math.max(1, Math.floor(options.limit ?? 20))
        );

        const concurrency = Math.min(
                3,
                Math.max(1, Math.floor(options.concurrency ?? 3))
        );

        const maxRuntimeMs = options.maxRuntimeMs ?? 210_000;

        // Keyset pagination ensures batches don't repeat users.
        let query = options.supabase
                .from('user_profiles')
                .select('user_id')
                .eq('onboarding_status', 'complete')
                .order('user_id', { ascending: true })
                .limit(limit + 1);

        if (options.cursor) {
                query = query.gt('user_id', options.cursor);
        }

        const { data, error } = await query;

        if (error) throw error;

        const fetched = (data ?? []) as Array<{
                user_id: string;
        }>;

        const profiles = fetched.slice(0, limit);
        const moreInDatabase = fetched.length > limit;

        const results: Array<UserBatchResult | undefined> =
                new Array(profiles.length);

        let nextIndex = 0;

        async function worker() {
                while (Date.now() - startedAt < maxRuntimeMs) {
                        const index = nextIndex++;

                        if (index >= profiles.length) {
                                return;
                        }

                        const userId = profiles[index].user_id;
                        const userStartedAt = Date.now();

                        try {
                                const extra = await options.processUser(userId);

                                results[index] = {
                                        user_id: userId,
                                        status: 'ok',
                                        duration_ms: Date.now() - userStartedAt,
                                        ...(extra ?? {})
                                };
                        } catch (error) {
                                const message = messageFromError(error);

                                console.error(
                                        `User batch failed for ${userId}:`,
                                        error
                                );

                                results[index] = {
                                        user_id: userId,
                                        status: 'failed',
                                        duration_ms: Date.now() - userStartedAt,
                                        error: message
                                };
                        }
                }
        }

        // Run multiple workers with bounded concurrency.
        await Promise.all(
                Array.from(
                        {
                                length: Math.min(concurrency, profiles.length)
                        },
                        () => worker()
                )
        );

        const completed = results.filter(
                (result): result is UserBatchResult =>
                        Boolean(result)
        );

        // Workers take contiguous indices in order.
        // All started jobs have finished when we reach here.
        const hasMore =
                completed.length < profiles.length ||
                moreInDatabase;

        const lastProcessedId = completed.length
                ? profiles[completed.length - 1].user_id
                : options.cursor ?? null;

        return {
                ok: true,
                processed: completed.length,
                succeeded: completed.filter(
                        (result) => result.status === 'ok'
                ).length,
                failed: completed.filter(
                        (result) => result.status === 'failed'
                ).length,
                duration_ms: Date.now() - startedAt,
                has_more: hasMore,
                next_cursor: hasMore ? lastProcessedId : null,
                results: completed
        };
}
