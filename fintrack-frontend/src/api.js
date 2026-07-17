import axios from 'axios';
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
function getHeaders(token) {
    return {
    headers: {
        Authorization: `Bearer ${token}`,
        withCredentials: false
    },
};
}

export const getHealthScore = (token) =>
    axios.get(
        `${BASE}/health-score`,
        getHeaders(token)
)

export const getTransactions = (token) =>
    axios.get(
        `${BASE}/transactions`,
        getHeaders(token)
)

export const addTransaction = (token, data) =>
    axios.post(
        `${BASE}/transactions/`,
        null,
        {
            params: data,
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )

export const getBills = (token) =>
    axios.get(`${BASE}/bills`, getHeaders(token));

export const getGoals = (token) =>
    axios.get(`${BASE}/goals`, getHeaders(token));

export const addBill = (token, data) =>
    axios.post(
        `${BASE}/bills`,
        data,
        getHeaders(token)
    )

export const updateBill = (token, id) =>
    axios.put(
        `${BASE}/bills/${id}`,
        {},
        getHeaders(token)
    )

    export const markBillPaid = (token, id) =>
    axios.put(
        `${BASE}/bills/${id}`,
        {},
        getHeaders(token)
    )


export const addGoal = (token, data) =>
    axios.post(
        `${BASE}/goals`,
        data,
        getHeaders(token)
    )

export const updateGoal = (token, id, amount) =>
    axios.put(
        `${BASE}/goals/${id}`,
        { amount },
        getHeaders(token)
    )

    export const addGoalSavings = (token, id, amount) =>
    axios.put(
        `${BASE}/goals/${id}`,
        null,
        {
            params: { amount },
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )
    
    export const askBuddy = (token, question) =>
    axios.post(
        `${BASE}/buddy/ask`,
        null,
        {
            params: {
                question
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )

    export const getBudgetRecommendation = (token) =>
        axios.get(`${BASE}/budget/recommend`, getHeaders(token))
    
    export const getSpendingAnalytics = (token) =>
        axios.get(`${BASE}/analytics/spending`, getHeaders(token))

    export const getPredictions = (token) =>
        axios.get(`${BASE}/analytics/predict`, getHeaders(token))

    export const getFeatureEngineering = (token) =>
        axios.get(`${BASE}/analytics/features`, getHeaders(token))

    export const parseSMS = (token, smsText) =>
        axios.post(`${BASE}/transactions/parse-sms`, null, {
            params: { sms_text: smsText },
            headers: { Authorization: `Bearer ${token}` }
        })

    export const getUserProfile = (token) =>
    axios.get(`${BASE}/users/me`, getHeaders(token))
    
    export const completeOnboarding = (token, monthly_income) =>
        axios.put(`${BASE}/users/onboarding`, { monthly_income }, getHeaders(token))

    export const addBill = (token, data) =>
        axios.post(`${BASE}/bills`, null,{
            params: data,
            headers: {Authorization: `Bearer ${token}`}
        })