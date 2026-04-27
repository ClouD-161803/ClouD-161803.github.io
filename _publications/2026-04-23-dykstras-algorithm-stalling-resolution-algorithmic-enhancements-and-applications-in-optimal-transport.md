---
title: "Dykstra's Algorithm: Stalling Resolution, Algorithmic Enhancements, and Applications in Optimal Transport"
collection: publications
category: thesis
permalink: /publication/2026-04-23-dykstras-algorithm-stalling-resolution-algorithmic-enhancements-and-applications-in-optimal-transport
excerpt: "Euclidean projections onto intersections of polyhedral sets are essential operations in constrained optimisation. Dykstra's algorithm provides an efficient iterative method for computing these projections; however, its practical utility is limited by a stalling phenomenon that can result in arbitrarily long execution cycles. The primary theoretical contribution of this thesis is the formalisation of the stalling condition and the derivation of its duration in closed form. Building on this mathematical resolution, a fast-forward modification is introduced that detects stalling and advances the internal memory variables beyond the stalling cycle in a single computational step. This modification eliminates the algorithm's unpredictable execution time while preserving its asymptotic convergence guarantees.

An accelerated version of the stall-averse solver is integrated within a large-scale, inexact projected gradient descent framework to address density estimation tasks via optimal transport. Specifically, we approximate Knothe-Rosenblatt triangular maps parameterised by a probabilist's Hermite polynomial basis. Empirical estimation of these maps requires enforcing monotonicity over a discrete sample ensemble, which yields an ill-conditioned polyhedral feasible set. The modified Dykstra algorithm is consequently employed to compute the required Euclidean projections onto this geometric structure.

The combined architecture is evaluated across two nonlinear tracking domains. In astrodynamics, the framework is applied to non-Gaussian uncertainty propagation in orbital dynamics, reconstructing the physical ground-truth shears of satellite state distributions when classical filters are inadequate. In geophysical data assimilation, the engine is used with the Lorenz 1963 system to approximate continuous mappings of chaotic probability densities. These results collectively demonstrate the robustness and scalability of the framework for mapping uncertainty distributions."
date: 2026-04-23
venue: 'Department of Mechanical and Aerospace Engineering, Princeton University'
paperurl: '/files/Senior_Thesis_compressed.pdf'
citation: "Claudio Vestini, Ryne Beeson, Bartolomeo Stellato. (2026). &quot;Dykstra's Algorithm: Stalling Resolution, Algorithmic Enhancements, and Applications in Optimal Transport.&quot; <i>Senior Thesis (4YP)</i>."
---
