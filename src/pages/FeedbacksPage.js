// src/pages/FeedbacksPage.js
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      const snap = await getDocs(collection(db, "orders"));
      let fbList = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.feedback) {
          fbList.push({ id: doc.id, ...data.feedback, customer: data.customer });
        }
      });
      setFeedbacks(fbList);

      // calculate avg rating
      const ratings = fbList.map(f => f.rating).filter(r => r > 0);
      const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
      setAvgRating(avg);
    };
    fetchFeedbacks();
  }, []);

  return (
    <div>
      <h2>Customer Feedbacks</h2>
      <p><strong>Average Rating:</strong> ⭐ {avgRating}</p>
      {feedbacks.length === 0 ? (
        <p>No feedbacks yet.</p>
      ) : (
        feedbacks.map(f => (
          <div key={f.id} className="card" style={{ margin: "8px 0", padding: "8px" }}>
            <p><strong>{f.customer}</strong></p>
            <p>Rating: {f.rating ? `⭐ ${f.rating}` : "No rating"}</p>
            <p>Feedback: {f.comment || "No comment"}</p>
            <p style={{ fontSize: "12px", color: "gray" }}>
              {f.submittedAt?.toDate?.().toLocaleString?.() || ""}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
