'use client';

/**
 * D-3 — taking any Academy course.
 *
 * Structurally the same as B-5's resident training screen, and deliberately so: same one-module-
 * per-screen pacing, same "answers held until the whole course is submitted", same explanations for
 * every question whether right or wrong. That posture was chosen because the goal is comprehension
 * rather than assessment, and nothing about a course being optional changes it.
 *
 * The one addition is the certification moment. A course that unlocks real access (D-5) says so on
 * the result screen, because that is the payoff the seller was working toward.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, Award, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useCourse, useSubmitCourse } from '../hooks/useAcademy';
import type { CourseAnswer, CourseResult } from '../types';

export function CoursePlayer({ slug }: { slug: string }) {
  const router = useRouter();
  const { data: course, isLoading, isError } = useCourse(slug);
  const submit = useSubmitCourse(slug);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CourseResult | null>(null);

  const modules = course?.modules ?? [];
  const current = modules[step];
  const stepComplete = useMemo(
    () => (current ? current.questions.every((q) => `${current.slug}:${q.id}` in answers) : false),
    [current, answers],
  );

  if (isLoading) return <Wrap><Skeleton $h="320px" $radius={16} /></Wrap>;
  if (isError || !course) {
    return (
      <Wrap>
        <ErrorState title="Couldn’t load this course" message="Please try again in a moment." />
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
          <Title>{result.passed ? 'Passed' : 'Not quite'}</Title>
          <Lede>
            {result.passed
              ? `You scored ${result.scorePercent}%.`
              : `You got ${result.correctCount} of ${result.totalCount}. Have a read below and try again — there’s no limit on attempts.`}
          </Lede>

          {/* The payoff, stated plainly. */}
          {result.certificationAwarded ? (
            <CertBanner>
              <Award size={18} aria-hidden />
              <span>
                You’ve earned <b>{result.certificationAwarded.label}</b>. Hubs that reserve stock for
                certified sellers will now let you take it.
              </span>
            </CertBanner>
          ) : null}

          <Explanations>
            {result.results.map((r) => (
              <Explanation key={`${r.moduleSlug}:${r.questionId}`} $correct={r.correct}>
                {r.explanation}
              </Explanation>
            ))}
          </Explanations>

          {result.passed ? (
            <Button fullWidth onClick={() => router.push('/seller/academy')}>
              Back to the Academy
            </Button>
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
      <Eyebrow>
        {course.title} · step {step + 1} of {modules.length}
      </Eyebrow>
      <Title as="h2">{current.title}</Title>

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
            const payload: CourseAnswer[] = Object.entries(answers).map(([k, answerIndex]) => {
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
const Eyebrow = styled.span`
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
const CertBanner = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.statusLive} 12%, ${theme.color.surfaceRaised})`};
  border: 1px solid
    ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 30%, transparent)`};
  color: ${({ theme }) => theme.color.statusLive};

  span {
    font-size: 13px;
    line-height: 1.5;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
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
