package com.luxshop.repository;

import com.luxshop.model.GiftCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface GiftCardRepository extends JpaRepository<GiftCard, Long> {

    Optional<GiftCard> findByCode(String code);

    Optional<GiftCard> findByPaymentId(String paymentId);

    List<GiftCard> findBySenderEmailOrderByCreatedAtDesc(String senderEmail);

    List<GiftCard> findByRecipientEmailOrderByCreatedAtDesc(String recipientEmail);

    List<GiftCard> findAllByOrderByCreatedAtDesc();

    // ✅ NUEVO: para limpiar PENDING abandonadas (más de 24h)
    List<GiftCard> findByStatusAndCreatedAtBefore(String status, LocalDateTime cutoff);

    // ✅ NUEVO: para marcar vencidas (ACTIVE hace más de 1 año)
    List<GiftCard> findByStatusAndActivatedAtBefore(String status, LocalDateTime cutoff);
}
