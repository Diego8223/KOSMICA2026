package com.luxshop.repository;

import com.luxshop.model.ReferralCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReferralCodeRepository extends JpaRepository<ReferralCode, Long> {

    /** Buscar código por su valor (ej: KOS-A3F9K2) */
    Optional<ReferralCode> findByCode(String code);

    /** Buscar el código activo de un usuario (no usado) */
    Optional<ReferralCode> findByOwnerEmailAndUsedFalse(String ownerEmail);

    /** Buscar CUALQUIER código del usuario (incluye los ya redimidos) */
    List<ReferralCode> findByOwnerEmailOrderByCreatedAtDesc(String ownerEmail);

    /** ¿Ya tiene algún código activo este email? */
    boolean existsByOwnerEmailAndUsedFalse(String ownerEmail);

    /** ¿Ya tiene un código (activo o no)? */
    boolean existsByOwnerEmail(String ownerEmail);

    /** Buscar por cupón de recompensa generado (REF15-XXXXXX) */
    Optional<ReferralCode> findByRewardCouponCode(String rewardCouponCode);
}
