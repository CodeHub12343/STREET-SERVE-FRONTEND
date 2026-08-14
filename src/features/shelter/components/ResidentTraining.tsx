'use client';

/**
 * B-5 — the starter course.
 *
 * This gates the first pickup, so it is tempting to build it like a compliance form. It isn't one.
 * Handing someone consigned goods without telling them the return window, what a cash sale costs
 * them, and where their money goes is how a well-meaning program creates its first debt spiral —
 * the course exists so nobody learns those rules by being charged.
 *
 * Consequences of that framing, visible in the code:
 *  • One module per screen. Four short screens beat one long scroll on a borrowed phone.
 *  • Answers can't be "wrong" in a punishing way — a failed attempt shows every explanation and
 *    offers an immediate retake, with no cooldown and no record the resident sees as a mark.
 *  • Progress is never lost to a mis-tap: answers are held until the whole course is submitted.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, Check, GraduationCap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useSubmitTraining, useTrainingCourse, useTrainingStatus } from '../hooks/useShelter';
import type { TrainingAnswer, TrainingResult } from '../types';

export function ResidentTraining() {
  const router = useRouter();
  const { data: course, isLoading, isError } = useTrainingCourse();
  const { data: status } = useTrainingStatus();
  const submit = useSubmitTraining();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<TrainingResult | null>(null);

  const modules = course?.modules ?? [];
  const current = modules[step];

  /** Every question on this screen answered — the gate for advancing, not for being correct. */
  const stepComplete = useMemo(
    () => (current ? current.questions.every((q) => `${current.slug}:${q.id}` in answers) : false),
    [current, answers],
  );

  if (isLoading) return <Wrap><Skeleton $h="320px" $radius={16} /></Wrap>;
  if (isError || !course) {
    return (
      <Wrap>
        <ErrorState title="Couldn’t load the course" message="Please try again in a moment." />
      </Wrap>
    );
  }

  // Already passed — nothing to prove twice.
  if (status?.passed && !result) {
    return (
      <Wrap>
        <Done>
          <DoneIcon aria-hidden><Check size={26} /></DoneIcon>
          <Title>You’re all set</Title>
          <Lede>You’ve finished the starter course. You can pick up stock from any nearby hub.</Lede>
          <Button fullWidth onClick={() => router.push('/seller/start')}>Find something to sell</Button>
        </Done>
      </Wrap>
    );
  }

  if (result) {
    return (
      <Wrap>
        <Done>
          <DoneIcon $fail={!result.passed} aria-hidden>
            {result.passed ? <Check size={26} /> : <RotateCcw size={22} />}
          </DoneIcon>
          <Title>{result.passed ? 'Nice work' : 'Almost there'}</Title>
          <Lede>
            {result.passed
              ? 'You’re ready to pick up your first stock. Your first one is covered — if it doesn’t sell, you won’t owe anything.'
              : `You got ${result.correctCount} of ${result.totalCount}. Have a read below and try again — there’s no limit on attempts.`}
          </Lede>

          {/* Explanations for EVERY question, right or wrong. Withholding them from someone who
              guessed correctly helps nobody. */}
          <Explanations>
            {result.results.map((r) => (
              <Explanation key={`${r.moduleSlug}:${r.questionId}`} $correct={r.correct}>
                {r.explanation}
              </Explanation>
            ))}
          </Explanations>

          {result.passed ? (
            <Button fullWidth onClick={() => router.push('/seller/start')}>Find something to sell</Button>
          ) : (
            <Button
              fullWidth
              onClick={() => {
                setResult(null);
                setAnswers({});
                setStep(0);
              }}
            >
              Try again
            </Button>
          )}
        </Done>
      </Wrap>
    );
  }

  if (!current) return null;
  const isLast = step === modules.length - 1;

  return (
    <Wrap>
      <Head>
        <Icon aria-hidden><GraduationCap size={18} /></Icon>
        <div>
          <Eyebrow>
            Step {step + 1} of {modules.length}
          </Eyebrow>
          <Title as="h2">{current.title}</Title>
        </div>
      </Head>

      <Rail
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={modules.length}
        aria-valuenow={step + 1}
        aria-label={`Step ${step + 1} of ${modules.length}`}
      >
        <RailFill style={{ width: `${((step + 1) / modules.length) * 100}%` }} />
      </Rail>

      {current.body.map((p) => (
        <Body key={p}>{p}</Body>
      ))}

      {current.questions.map((q) => {
        const key = `${current.slug}:${q.id}`;
        return (
          <Question key={q.id}>
            <Prompt>{q.prompt}</Prompt>
            <Options role="radiogroup" aria-label={q.prompt}>
              {q.options.map((opt, i) => (
                <Option
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={answers[key] === i}
                  $on={answers[key] === i}
                  onClick={() => setAnswers((a) => ({ ...a, [key]: i }))}
                >
                  {opt}
                </Option>
              ))}
            </Options>
          </Question>
        );
      })}

      <Nav>
        {step > 0 ? (
          <Button variant="secondary" size="compact" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft size={15} aria-hidden /> Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          disabled={!stepComplete}
          loading={submit.isPending}
          onClick={() => {
            if (!isLast) {
              setStep((s) => s + 1);
              return;
            }
            const payload: TrainingAnswer[] = Object.entries(answers).map(([k, answerIndex]) => {
              const [moduleSlug, questionId] = k.split(':');
              return { moduleSlug: moduleSlug!, questionId: questionId!, answerIndex };
            });
            submit.mutate(payload, { onSuccess: setResult });
          }}
        >
          {isLast ? 'Finish' : 'Next'} <ArrowRight size={15} aria-hidden />
        </Button>
      </Nav>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 520px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[4]}px;
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Icon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: 50%;
  color: ${({ theme }) => theme.color.statusLive};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 14%, transparent)`};
`;
const Eyebrow = styled.span`
  display: block;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Title = styled.h1`
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.textPrimary};
  margin: 0;
`;
const Lede = styled.p`
  font-size: 14px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0;
`;
const Rail = styled.div`
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.line2};
  overflow: hidden;
`;
const RailFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.statusLive};
  transition: width 200ms ease;
`;
const Body = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0;
`;
const Question = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Prompt = styled.p`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
  margin: 0;
`;
const Options = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
/** Full-width tap targets — this is answered with a thumb, standing up. */
const Option = styled.button<{ $on: boolean }>`
  width: 100%;
  text-align: left;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  font-size: 14px;
  line-height: 1.4;
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.statusLive : theme.color.line2)};
  background: ${({ theme, $on }) =>
    $on ? `color-mix(in srgb, ${theme.color.statusLive} 12%, transparent)` : 'transparent'};
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Nav = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Done = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  justify-items: start;
`;
const DoneIcon = styled.span<{ $fail?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: ${({ theme, $fail }) => ($fail ? theme.color.statusAway : theme.color.statusLive)};
  background: ${({ theme, $fail }) =>
    `color-mix(in srgb, ${$fail ? theme.color.statusAway : theme.color.statusLive} 14%, transparent)`};
`;
const Explanations = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  width: 100%;
`;
const Explanation = styled.p<{ $correct: boolean }>`
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-left: 3px solid
    ${({ theme, $correct }) => ($correct ? theme.color.statusLive : theme.color.statusAway)};
  color: ${({ theme }) => theme.color.textSecondary};
`;
