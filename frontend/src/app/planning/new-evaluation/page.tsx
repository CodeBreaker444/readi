import EvaluationRequest from "@/src/components/planning/EvaluationRequest";

export default function Page() {
  return (
    <div className={`p-4 sm:p-6 lg:p-8 bg-gray-50 `}>
        <div className="mb-6">
        <h1 className={`text-2xl sm:text-3xl font-bold  text-gray-900`}>
          Planning | New Evaluation Request
        </h1>
        <p className={`mt-1 text-sm text-gray-600`}>
          Create a new operational scenario evaluation request
        </p>
      </div>
        <EvaluationRequest isDark={false} />;
    </div>
  )
}