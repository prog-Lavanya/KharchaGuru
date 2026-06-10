

import { useState } from "react";

export default function ReportGenerator() {

  const [loading, setLoading] = useState(false);

  const downloadReport = async () => {
    setLoading(true);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("https://kharchaguru-0cgi.onrender.com/reports/download", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "report.pdf";
      a.click();

    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="glass-card p-6 rounded-2xl">

      <h2 className="text-white text-xl mb-4 font-bold">
        Generate Report
      </h2>

      <button
        onClick={downloadReport}
        className="w-full bg-teal-500 py-3 rounded-xl text-black font-bold"
      >
        {loading ? "Generating..." : "Download PDF"}
      </button>

    </div>
  );
}