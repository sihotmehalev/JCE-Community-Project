import React, { } from "react";
import { Card, CardContent } from "../ui/card";

export default function RegisterLayout({ title, children, onSubmit, loading, message }) {
  return (
    <div className="flex items-center justify-center p-6">
      <Card className="w-[500px] bg-gradient-to-br from-white to-orange-50/80">
        <CardContent className="px-8 py-6">
          <h2 className="text-2xl font-bold text-center mb-8 text-orange-800">{title}</h2>
          <form className="space-y-5" onSubmit={onSubmit}>
            {children}
            <div className="max-w-[400px] mx-auto pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg font-medium text-white shadow-lg
                  bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600
                  hover:from-orange-500 hover:via-orange-600 hover:to-orange-700
                  focus:ring-2 focus:ring-orange-400/50 focus:ring-offset-2
                  transform hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "נרשם..." : "הירשם"}
              </button>
            </div>
          </form>
          {message && (
            <p className={`mt-4 text-center text-sm ${message.includes("בהצלחה") ? "text-orange-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}