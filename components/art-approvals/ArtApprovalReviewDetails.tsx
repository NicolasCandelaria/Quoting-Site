import type { ArtApprovalReviewContextApproval } from "@/lib/art-approvals/models";

type FormFields = ArtApprovalReviewContextApproval["formFields"];

function trimOrDash(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  return t.length > 0 ? t : "—";
}

function logoRowHasContent(logo: FormFields["logos"][number]): boolean {
  return [logo.logo, logo.color, logo.location, logo.application].some((s) => (s ?? "").trim().length > 0);
}

type Props = {
  formFields: FormFields;
};

export function ArtApprovalReviewDetails({ formFields }: Props) {
  const logosWithContent = formFields.logos.filter(logoRowHasContent);

  return (
    <div className="mt-6 rounded-button border border-black/10 bg-white/60 p-4">
      <h2 className="text-subsection-title font-semibold text-text-primary">What you&apos;re reviewing</h2>
      <dl className="mt-4 space-y-3 text-body">
        <div>
          <dt className="text-text-secondary">Material</dt>
          <dd className="font-medium text-text-primary">{trimOrDash(formFields.material)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Item size</dt>
          <dd className="font-medium text-text-primary">{trimOrDash(formFields.itemSize)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Base color</dt>
          <dd className="font-medium text-text-primary">{trimOrDash(formFields.baseColor)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Additional notes</dt>
          <dd className="whitespace-pre-wrap font-medium text-text-primary">
            {trimOrDash(formFields.additionalNotes)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-black/10 pt-4">
        <h3 className="text-body font-semibold text-text-primary">Logos</h3>
        {logosWithContent.length === 0 ? (
          <p className="mt-2 text-body text-text-secondary">No logo details were provided.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {formFields.logos.map((row, index) => {
              if (!logoRowHasContent(row)) return null;
              const n = index + 1;
              return (
                <li
                  key={`logo-${n}-${row.logo}-${row.color}`}
                  className="rounded-md border border-black/5 bg-white/80 p-3"
                >
                  <p className="text-body font-medium text-text-primary">Logo {n}</p>
                  <dl className="mt-2 space-y-2 text-body">
                    <div>
                      <dt className="text-text-secondary">Logo</dt>
                      <dd className="text-text-primary">{trimOrDash(row.logo)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Color</dt>
                      <dd className="text-text-primary">{trimOrDash(row.color)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Location</dt>
                      <dd className="text-text-primary">{trimOrDash(row.location)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Application</dt>
                      <dd className="text-text-primary">{trimOrDash(row.application)}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(formFields.optionalProjectId ?? formFields.optionalItemId) ? (
        <div className="mt-5 border-t border-black/10 pt-4">
          <h3 className="text-body font-semibold text-text-primary">Linked records</h3>
          <dl className="mt-2 space-y-2 text-body">
            {formFields.optionalProjectId ? (
              <div>
                <dt className="text-text-secondary">Quote project</dt>
                <dd className="break-all font-mono text-sm text-text-primary">{formFields.optionalProjectId}</dd>
              </div>
            ) : null}
            {formFields.optionalItemId ? (
              <div>
                <dt className="text-text-secondary">Quote item</dt>
                <dd className="break-all font-mono text-sm text-text-primary">{formFields.optionalItemId}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
