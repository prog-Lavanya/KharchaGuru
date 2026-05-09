import { useState } from "react";

export default function EditableInfoCard({
  label,
  value,
  onSave,
  type = "text"
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || "");

  const handleSave = async () => {
    try {
      await onSave(temp);
      setEditing(false);
    } catch (e) {
      console.error(e);
      alert("Error saving");
    }
  };

  const handleCancel = () => {
    setTemp(value || "");
    setEditing(false);
  };

  return (
    <div className="bg-slate-800/40 p-5 rounded-xl border border-white/10">

      <p className="text-xs text-slate-400 mb-2">{label}</p>

      {!editing ? (
        <div className="flex justify-between items-center">
          <p className="text-white font-semibold">
            {value || "Not provided"}
          </p>

          <button
            onClick={() => setEditing(true)}
            className="text-teal-400 text-sm"
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type={type}
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-teal-500 px-3 py-1 rounded text-black"
            >
              Save
            </button>

            <button
              onClick={handleCancel}
              className="bg-slate-700 px-3 py-1 rounded text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}