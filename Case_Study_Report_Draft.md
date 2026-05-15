# Case Study Report Draft: Heart Disease Risk Prediction

## 1. Executive Summary
We mined historical heart-related clinical data to improve early detection of high-risk patients. Two models were compared, with recall prioritized to reduce clinically dangerous false negatives. Based on this notebook run, the recommended model is **Random Forest** for EHR triage support.

## 2. Methodology Overview
The workflow included data cleaning and imputation, descriptive analytics, association rule mining, K-Means clustering for patient archetypes, and classification using Decision Tree and Random Forest.

## 3. Key Clinical Insights
### Association Rules
- If cp=4.0, oldpeak=oldpeak_Q4, thal=7.0, then HeartDisease=1 (support=0.116, confidence=1.000, lift=2.180).
- If exang=1.0, oldpeak=oldpeak_Q4, thal=7.0, then HeartDisease=1 (support=0.102, confidence=1.000, lift=2.180).
- If cp=4.0, restecg=2.0, thal=7.0, then HeartDisease=1 (support=0.132, confidence=0.976, lift=2.127).

### Patient Archetypes
Cluster 0: 159 patients, Cluster 1: 144 patients

## 4. Model Evaluation and Selection
        model  accuracy  precision   recall       f1
Random Forest  0.828947   0.805556 0.828571 0.816901
Decision Tree  0.697368   0.730769 0.542857 0.622951

In clinical settings, minimizing false negatives is critical because missed high-risk patients may not receive timely intervention.

## 5. Strategic Recommendation and Next Steps
1. Deploy **Random Forest** for initial risk flagging.
2. Keep Decision Tree outputs available for interpretability with clinicians.
3. Monitor data drift monthly and retrain as needed.
4. Mitigate risks: bias checks, threshold governance, clinician feedback loop.

## Figure Captions
- outputs/decision_tree_plot.png: Split logic for patient risk classification.
- outputs/random_forest_confusion_matrix.png: False negatives vs false positives in ensemble predictions.
- outputs/feature_importance_top15.png: Most influential predictors.
- outputs/cluster_pca_scatter.png: Visualized patient archetypes.
